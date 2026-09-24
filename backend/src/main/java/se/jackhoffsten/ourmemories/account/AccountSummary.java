package se.jackhoffsten.ourmemories.account;

import java.time.Instant;
import java.util.UUID;

public record AccountSummary(UUID id, String username, AccountSlot slot, Instant createdAt) {}
