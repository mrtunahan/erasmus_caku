export const generateColorFromString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        "#EF4444", "#F97316", "#EAB308", "#22C55E", "#10B981",
        "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
        "#EC4899", "#F43F5E"
    ];
    return colors[Math.abs(hash) % colors.length];
};
