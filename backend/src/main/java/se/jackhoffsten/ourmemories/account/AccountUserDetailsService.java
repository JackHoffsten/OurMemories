package se.jackhoffsten.ourmemories.account;

import java.util.Locale;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AccountUserDetailsService implements UserDetailsService {
    private final AccountRepository accounts;

    AccountUserDetailsService(AccountRepository accounts) {
        this.accounts = accounts;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        Account account =
                accounts.findByUsername(username.strip().toLowerCase(Locale.ROOT))
                        .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
        return User.withUsername(account.toSummary().username())
                .password(account.passwordHash())
                .roles("MEMBER")
                .build();
    }
}
