package se.jackhoffsten.ourmemories.account;

import java.nio.CharBuffer;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountProvisioningService {
    private final AccountRepository accounts;
    private final PasswordEncoder passwordEncoder;

    public AccountProvisioningService(AccountRepository accounts, PasswordEncoder passwordEncoder) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AccountSummary provision(String username, AccountSlot slot, char[] password) {
        String normalizedUsername =
                username == null ? "" : username.strip().toLowerCase(Locale.ROOT);
        if (!normalizedUsername.matches("[a-z0-9][a-z0-9._-]{2,31}")) {
            throw new IllegalArgumentException(
                    "Username must be 3–32 characters: letters, digits, dots, underscores or hyphens, starting with a letter or digit.");
        }
        if (slot == null) {
            throw new IllegalArgumentException("Choose the FIRST or SECOND account slot.");
        }
        if (password == null || password.length < 12 || password.length > 128) {
            throw new IllegalArgumentException("Password must contain 12–128 characters.");
        }
        if (accounts.existsByUsername(normalizedUsername) || accounts.existsBySlot(slot)) {
            throw new IllegalStateException("Username or account slot already exists.");
        }
        String hash = passwordEncoder.encode(CharBuffer.wrap(password));
        try {
            return accounts.saveAndFlush(new Account(normalizedUsername, slot, hash)).toSummary();
        } catch (DataIntegrityViolationException exception) {
            throw new IllegalStateException(
                    "Account could not be created; check whether the username or slot is already in use.");
        }
    }
}
