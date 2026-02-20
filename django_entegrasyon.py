"""
Ogrenci Portali - Django Entegrasyon Ornegi

Bu dosya, scraper'i Django projenize entegre etmek icin
gerekli model, management command ve Celery task orneklerini icerir.
Projenizin yapisina gore duzenleyin.
"""


# ═══════════════════════════════════════════════════════════════════════════
# 1. MODEL - Otomatik cekilen duyurular icin veritabani modeli
# ═══════════════════════════════════════════════════════════════════════════
#
# Dosya: portal/models.py (mevcut modellerinize ekleyin)

"""
from django.db import models


class OtomatikDuyuru(models.Model):
    '''Dis kaynaklardan otomatik cekilen duyurular.'''

    KAYNAK_CHOICES = [
        ('bmu', 'Bilgisayar Muhendisligi'),
        ('mf', 'Muhendislik Fakultesi'),
        ('univ', 'Universite Genel'),
        ('oidb', 'Ogrenci Isleri'),
    ]

    DURUM_CHOICES = [
        ('beklemede', 'Onay Bekliyor'),
        ('yayinda', 'Yayinda'),
        ('reddedildi', 'Reddedildi'),
    ]

    scraper_id = models.CharField(
        max_length=20,
        unique=True,
        help_text="Scraper tarafindan uretilen benzersiz ID"
    )
    baslik = models.CharField(max_length=500)
    ozet = models.TextField(blank=True)
    icerik = models.TextField(blank=True)
    tarih = models.DateTimeField(null=True, blank=True)
    kaynak_url = models.URLField(max_length=1000)
    kaynak = models.CharField(max_length=10, choices=KAYNAK_CHOICES, default='bmu')
    durum = models.CharField(max_length=15, choices=DURUM_CHOICES, default='beklemede')

    # Otomatik alanlar
    olusturulma = models.DateTimeField(auto_now_add=True)
    guncelleme = models.DateTimeField(auto_now=True)

    # Portal'daki gonderi ile iliski (onaylandiktan sonra)
    gonderi = models.ForeignKey(
        'Gonderi',  # Mevcut gonderi modelinizin adi
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='otomatik_duyuru',
    )

    class Meta:
        ordering = ['-tarih']
        verbose_name = 'Otomatik Duyuru'
        verbose_name_plural = 'Otomatik Duyurular'

    def __str__(self):
        return f"[{self.get_kaynak_display()}] {self.baslik[:80]}"

    def onayla_ve_yayinla(self):
        '''Duyuruyu onaylayip portal gonderisi olarak yayinla.'''
        from .services import gonderi_olustur  # circular import onleme
        gonderi = gonderi_olustur(self)
        self.gonderi = gonderi
        self.durum = 'yayinda'
        self.save()
        return gonderi
"""


# ═══════════════════════════════════════════════════════════════════════════
# 2. MANAGEMENT COMMAND - Terminal'den calistirma
# ═══════════════════════════════════════════════════════════════════════════
#
# Dosya: portal/management/commands/duyuru_cek.py

"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from portal.models import OtomatikDuyuru
from scraper import KaratekinScraper, Duyuru  # scraper.py'yi import edin
from dateutil import parser as date_parser
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'BMU web sitesinden duyurulari otomatik ceker'

    def add_arguments(self, parser):
        parser.add_argument(
            '--kaynak',
            type=str,
            default='bmu',
            choices=['bmu', 'mf', 'univ', 'oidb'],
            help='Hangi kaynaktan cekilecek',
        )
        parser.add_argument(
            '--otomatik-onayla',
            action='store_true',
            help='Duyurulari otomatik olarak onayla ve yayinla',
        )
        parser.add_argument(
            '--no-detail',
            action='store_true',
            help='Detay sayfalarini cekme',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Duyuru taramasi basliyor...'))

        scraper = KaratekinScraper()
        yeni_duyurular = scraper.calistir(detay_cek=not options['no_detail'])

        eklenen = 0
        atlanan = 0

        for d in yeni_duyurular:
            # Veritabaninda zaten var mi?
            if OtomatikDuyuru.objects.filter(scraper_id=d.id).exists():
                atlanan += 1
                continue

            # Tarihi parse et
            tarih = None
            if d.tarih:
                try:
                    tarih = date_parser.parse(d.tarih)
                except (ValueError, TypeError):
                    tarih = timezone.now()

            obj = OtomatikDuyuru.objects.create(
                scraper_id=d.id,
                baslik=d.baslik,
                ozet=d.ozet or '',
                icerik=d.icerik or '',
                tarih=tarih,
                kaynak_url=d.url,
                kaynak=options['kaynak'],
                durum='yayinda' if options['otomatik_onayla'] else 'beklemede',
            )

            if options['otomatik_onayla']:
                obj.onayla_ve_yayinla()

            eklenen += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Tamamlandi! {eklenen} yeni duyuru eklendi, {atlanan} atlandi.'
            )
        )
"""


# ═══════════════════════════════════════════════════════════════════════════
# 3. CELERY TASK - Periyodik otomatik calistirma
# ═══════════════════════════════════════════════════════════════════════════
#
# Dosya: portal/tasks.py

"""
from celery import shared_task
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)


@shared_task(
    name='portal.duyuru_cek',
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 dakika sonra tekrar dene
)
def duyuru_cek_task(self):
    '''
    Duyurulari otomatik olarak ceken Celery task.
    Celery Beat ile periyodik calistirilir.
    '''
    try:
        logger.info('Otomatik duyuru taramasi basliyor...')
        call_command('duyuru_cek', kaynak='bmu')
        logger.info('Duyuru taramasi tamamlandi.')
    except Exception as exc:
        logger.error(f'Duyuru taramasi basarisiz: {exc}')
        self.retry(exc=exc)


@shared_task(name='portal.tum_kaynaklari_tara')
def tum_kaynaklari_tara_task():
    '''Tum kaynaklardan duyuru cek.'''
    kaynaklar = ['bmu', 'mf', 'univ', 'oidb']
    for kaynak in kaynaklar:
        try:
            call_command('duyuru_cek', kaynak=kaynak)
        except Exception as e:
            logger.error(f'{kaynak} taramasi basarisiz: {e}')
"""


# ═══════════════════════════════════════════════════════════════════════════
# 4. CELERY BEAT SCHEDULE - settings.py'ye ekleyin
# ═══════════════════════════════════════════════════════════════════════════

"""
# settings.py

CELERY_BEAT_SCHEDULE = {
    'duyuru-tara-30dk': {
        'task': 'portal.duyuru_cek',
        'schedule': 30 * 60,  # Her 30 dakikada bir
    },
    'tum-kaynaklar-gunluk': {
        'task': 'portal.tum_kaynaklari_tara',
        'schedule': crontab(hour=8, minute=0),  # Her gun sabah 8'de
    },
}
"""


# ═══════════════════════════════════════════════════════════════════════════
# 5. ADMIN PANEL - Duyurulari yonetmek icin
# ═══════════════════════════════════════════════════════════════════════════
#
# Dosya: portal/admin.py

"""
from django.contrib import admin
from .models import OtomatikDuyuru


@admin.register(OtomatikDuyuru)
class OtomatikDuyuruAdmin(admin.ModelAdmin):
    list_display = ['baslik_kisalt', 'kaynak', 'durum', 'tarih', 'olusturulma']
    list_filter = ['durum', 'kaynak', 'olusturulma']
    search_fields = ['baslik', 'icerik']
    actions = ['onayla', 'reddet']
    readonly_fields = ['scraper_id', 'kaynak_url', 'olusturulma', 'guncelleme']

    def baslik_kisalt(self, obj):
        return obj.baslik[:80] + ('...' if len(obj.baslik) > 80 else '')
    baslik_kisalt.short_description = 'Baslik'

    @admin.action(description='Secili duyurulari onayla ve yayinla')
    def onayla(self, request, queryset):
        for obj in queryset.filter(durum='beklemede'):
            obj.onayla_ve_yayinla()
        self.message_user(request, f'{queryset.count()} duyuru onaylandi.')

    @admin.action(description='Secili duyurulari reddet')
    def reddet(self, request, queryset):
        queryset.update(durum='reddedildi')
        self.message_user(request, f'{queryset.count()} duyuru reddedildi.')
"""


# ═══════════════════════════════════════════════════════════════════════════
# 6. CRONTAB ALTERNATIFI - Celery kullanmiyorsaniz
# ═══════════════════════════════════════════════════════════════════════════

"""
# Crontab ile her 30 dakikada bir calistirma:
# crontab -e ile acip sunu ekleyin:

*/30 * * * * cd /path/to/your/project && /path/to/venv/bin/python manage.py duyuru_cek --kaynak bmu >> /var/log/duyuru_scraper.log 2>&1

# Veya systemd timer kullanabilirsiniz:
# /etc/systemd/system/duyuru-scraper.timer
"""
