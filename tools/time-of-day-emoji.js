export function getTimeOfDayEmoji() {
    const date = new Date();
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) {
        return '🌅'; // dawn
    } else if (hour >= 12 && hour < 17) {
        return '🌞'; // noon
    } else if (hour >= 17 && hour < 20) {
        return '🌆'; // dusk
    } else {
        return '🌙'; // night
    }
}
