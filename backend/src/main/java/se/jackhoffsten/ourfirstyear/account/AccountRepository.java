package se.jackhoffsten.ourfirstyear.account;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface AccountRepository extends JpaRepository<Account, UUID> {
    boolean existsByUsername(String username);

    boolean existsBySlot(AccountSlot slot);
}
