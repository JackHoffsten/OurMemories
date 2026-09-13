package se.jackhoffsten.ourfirstyear.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "accounts", schema = "capsule")
class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 32)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 6)
    private AccountSlot slot;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Account() {
    }

    Account(String username, AccountSlot slot, String passwordHash) {
        this.username = username;
        this.slot = slot;
        this.passwordHash = passwordHash;
        this.createdAt = Instant.now();
    }

    AccountSummary toSummary() {
        return new AccountSummary(id, username, slot, createdAt);
    }
}
