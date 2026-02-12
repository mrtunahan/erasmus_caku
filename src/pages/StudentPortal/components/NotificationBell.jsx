
import React, { useState, useEffect } from 'react';
import { C as PC } from '../../../constants/theme';
import { ICONS, SvgIcon } from '../../../components/ui/Icons';
import { DY } from '../constants';
import { getUserId, timeAgo } from '../utils';
import PortalService from '../service';

const NotificationBell = ({ currentUser }) => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    var userId = getUserId(currentUser);

    useEffect(function () {
        var load = function () {
            PortalService.fetchNotifications(userId, 10).then(function (notifs) {
                setNotifications(notifs);
                setUnread(notifs.filter(function (n) { return !n.read; }).length);
            }).catch(function () { });
        };
        load();
        var interval = setInterval(load, 30000);
        return function () { clearInterval(interval); };
    }, [userId]);

    return (
        <div style={{ position: "relative" }}>
            <button onClick={function () { setOpen(!open); }}
                style={{ padding: 8, border: "none", background: "transparent", cursor: "pointer", position: "relative", borderRadius: 8 }}
                title="Bildirimler"
            >
                <SvgIcon path={ICONS.bell} size={22} color={DY.warm} />
                {unread > 0 && (
                    <span style={{
                        position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%",
                        background: "#EF4444", color: "white", fontSize: 10, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{unread > 9 ? "9+" : unread}</span>
                )}
            </button>
            {open && (
                <div style={{
                    position: "absolute", top: "100%", right: 0, width: 320, maxHeight: 400, overflow: "auto",
                    background: "white", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    border: "1px solid " + PC.borderLight, zIndex: 100,
                }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid " + PC.borderLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: DY.warm }}>Bildirimler</span>
                        {unread > 0 && (
                            <button onClick={function () {
                                PortalService.markAllNotificationsRead(userId).then(function () {
                                    setNotifications(notifications.map(function (n) { return Object.assign({}, n, { read: true }); }));
                                    setUnread(0);
                                });
                            }} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 11, color: DY.gold, fontWeight: 600 }}>
                                Tümünü Okundu İşaretle
                            </button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <div style={{ padding: 24, textAlign: "center", color: PC.textMuted, fontSize: 13 }}>Henüz bildirim yok</div>
                    ) : notifications.map(function (n) {
                        return (
                            <div key={n.id} style={{ padding: "10px 16px", borderBottom: "1px solid " + PC.borderLight, background: n.read ? "transparent" : DY.warmLight }}>
                                <div style={{ fontSize: 13, color: PC.navy }}>{n.message || "Bildirim"}</div>
                                <div style={{ fontSize: 11, color: PC.textMuted, marginTop: 2 }}>{n.createdAt ? timeAgo(n.createdAt) : ""}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
