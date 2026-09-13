package se.jackhoffsten.ourfirstyear.memory;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

interface MemoryRepository extends JpaRepository<Memory, UUID> {
}
