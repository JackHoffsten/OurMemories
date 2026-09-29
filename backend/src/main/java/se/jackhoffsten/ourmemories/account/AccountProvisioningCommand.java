package se.jackhoffsten.ourmemories.account;

import java.io.Console;
import java.util.Arrays;
import java.util.Locale;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("provision")
class AccountProvisioningCommand implements ApplicationRunner {
    private final AccountProvisioningService accounts;

    AccountProvisioningCommand(AccountProvisioningService accounts) {
        this.accounts = accounts;
    }

    @Override
    public void run(ApplicationArguments args) {
        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException(
                    "Account provisioning requires an interactive terminal. Run the packaged JAR directly.");
        }
        String slotInput = console.readLine("Account slot (FIRST or SECOND): ");
        if (slotInput == null) {
            throw new IllegalArgumentException("Provisioning cancelled.");
        }
        AccountSlot slot;
        try {
            slot = AccountSlot.valueOf(slotInput.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Choose the FIRST or SECOND account slot.");
        }
        String username = console.readLine("Username: ");
        char[] password = null;
        char[] confirmation = null;
        try {
            password = console.readPassword("Password (12–128 characters): ");
            confirmation = console.readPassword("Confirm password: ");
            if (password == null
                    || confirmation == null
                    || !Arrays.equals(password, confirmation)) {
                throw new IllegalArgumentException(
                        "Passwords did not match or provisioning was cancelled.");
            }
            AccountSummary account = accounts.provision(username, slot, password);
            console.printf("Created account %s in slot %s.%n", account.username(), account.slot());
        } finally {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmation != null) Arrays.fill(confirmation, '\0');
        }
    }
}
