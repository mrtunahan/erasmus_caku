
import { PORTAL_CATEGORIES } from './constants';

export function timeAgo(timestamp) {
    if (!timestamp) return "";
    var date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    var now = new Date();
    var diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Az önce";
    if (diff < 3600) return Math.floor(diff / 60) + " dk önce";
    if (diff < 86400) return Math.floor(diff / 3600) + " saat önce";
    if (diff < 604800) return Math.floor(diff / 86400) + " gün önce";
    return date.toLocaleDateString("tr-TR");
}

export function getCategoryInfo(catId) {
    return PORTAL_CATEGORIES.find(function (c) { return c.id === catId; }) || PORTAL_CATEGORIES[0];
}

export function getReactionTotal(reactions) {
    if (!reactions) return 0;
    var total = 0;
    Object.values(reactions).forEach(function (arr) { total += (arr || []).length; });
    return total;
}

export function getUserId(currentUser) {
    return currentUser ? (currentUser.email || currentUser.name || "anon") : "anon";
}

// Basit avatar oluştur
export function getInitials(name) {
    if (!name) return "?";
    var parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export function hashColor(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    var colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981", "#6366F1", "#14B8A6"];
    return colors[Math.abs(hash) % colors.length];
}
