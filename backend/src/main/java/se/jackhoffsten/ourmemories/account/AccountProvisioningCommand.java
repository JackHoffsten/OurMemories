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
        String configuredUsername = System.getenv("OURMEMORIES_PROVISION_USERNAME");
        String configuredPassword = System.getenv("OURMEMORIES_PROVISION_PASSWORD");
        if (configuredUsername != null && configuredPassword != null) {
            char[] password = configuredPassword.toCharArray();
            try {
                createAccount(
                        configuredUsername,
                        System.getenv().getOrDefault("OURMEMORIES_PROVISION_SLOT", "FIRST"),
                        password,
                        null);
            } finally {
                Arrays.fill(password, '\0');
            }
            return;
        }

        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException(
                    "Account provisioning requires an interactive terminal. Run the packaged JAR directly.");
        }
        String slotInput = console.readLine("Account slot (FIRST or SECOND): ");
        if (slotInput == null) {
            throw new IllegalArgumentException("Provisioning cancelled.");
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
            createAccount(username, slotInput, password, console);
        } finally {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmation != null) Arrays.fill(confirmation, '\0');
        }
    }

    private void createAccount(
            String username, String slotInput, char[] password, Console console) {
        AccountSlot slot;
        try {
            slot = AccountSlot.valueOf(slotInput.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Choose the FIRST or SECOND account slot.");
        }
        AccountSummary account = accounts.provision(username, slot, password);
        String message =
                "Created account %s in slot %s.%n".formatted(account.username(), account.slot());
        if (console == null) System.out.print(message);
        else console.printf(message);
    }
}
