package se.jackhoffsten.ourmemories.security;

import java.time.Clock;
import java.time.Duration;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

final class LoginThrottle {
    private static final long WINDOW = Duration.ofMinutes(15).toMillis();
    private static final int MAX_KEYS = 10000;
    private final Map<String, Window> windows = new HashMap<>();
    private final Clock clock;

    LoginThrottle() {
        this(Clock.systemUTC());
    }

    LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    synchronized long acquire(String address, String username) {
        long now = clock.millis();
        windows.entrySet().removeIf(entry -> entry.getValue().expires <= now);
        String ip = "ip:" + address;
        String user = "user:" + (username == null ? "" : username.strip().toLowerCase(Locale.ROOT));
        if (user.length() > 100) user = "user:invalid";
        long wait = Math.max(waitFor(ip, 30, now), waitFor(user, 10, now));
        if (wait > 0) return wait;
        if (windows.size() >= MAX_KEYS && (!windows.containsKey(ip) || !windows.containsKey(user)))
            return 60;
        increment(ip, now);
        increment(user, now);
        return 0;
    }

    private long waitFor(String key, int limit, long now) {
        Window window = windows.get(key);
        return window != null && window.count >= limit
                ? Math.max(1, (window.expires - now + 999) / 1000)
                : 0;
    }

    private void increment(String key, long now) {
        Window previous = windows.get(key);
        windows.put(
                key,
                previous == null
                        ? new Window(1, now + WINDOW)
                        : new Window(previous.count + 1, previous.expires));
    }

    private record Window(int count, long expires) {}
}
