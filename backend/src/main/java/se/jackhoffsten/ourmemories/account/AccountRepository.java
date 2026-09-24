package se.jackhoffsten.ourmemories.account;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsBySlot(AccountSlot slot);
}
