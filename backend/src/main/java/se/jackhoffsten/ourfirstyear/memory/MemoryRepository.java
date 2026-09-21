package se.jackhoffsten.ourfirstyear.memory;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface MemoryRepository extends JpaRepository<Memory, UUID> {}
