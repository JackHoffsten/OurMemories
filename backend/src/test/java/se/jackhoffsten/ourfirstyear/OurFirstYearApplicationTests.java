package se.jackhoffsten.ourfirstyear;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class OurFirstYearApplicationTests {

	@Container
	@ServiceConnection
	static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.3-alpine");

	private final Flyway flyway;
	private final JdbcTemplate jdbcTemplate;

	@Autowired
	OurFirstYearApplicationTests(Flyway flyway, JdbcTemplate jdbcTemplate) {
		this.flyway = flyway;
		this.jdbcTemplate = jdbcTemplate;
	}

	@Test
	void appliesMigrationsOnStartup() {
		assertThat(jdbcTemplate.queryForObject(
				"SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'capsule')",
				Boolean.class)).isTrue();
		assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("1");
		assertThat(flyway.info().pending()).isEmpty();
		assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
	}

	@Test
	void doesNotReapplyCompletedMigrations() {
		assertThat(flyway.migrate().migrationsExecuted).isZero();
	}

}
