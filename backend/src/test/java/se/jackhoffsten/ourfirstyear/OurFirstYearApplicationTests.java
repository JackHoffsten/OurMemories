package se.jackhoffsten.ourfirstyear;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import se.jackhoffsten.ourfirstyear.account.AccountProvisioningService;
import se.jackhoffsten.ourfirstyear.account.AccountSlot;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Testcontainers
class OurFirstYearApplicationTests {

	@Container
	@ServiceConnection
	static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.3-alpine");

	private final Flyway flyway;
	private final JdbcTemplate jdbcTemplate;
	private final AccountProvisioningService accounts;
	private final PasswordEncoder passwordEncoder;

	@Autowired
	OurFirstYearApplicationTests(Flyway flyway, JdbcTemplate jdbcTemplate,
			AccountProvisioningService accounts, PasswordEncoder passwordEncoder) {
		this.flyway = flyway;
		this.jdbcTemplate = jdbcTemplate;
		this.accounts = accounts;
		this.passwordEncoder = passwordEncoder;
	}

	@Test
	void appliesMigrationsOnStartup() {
		assertThat(jdbcTemplate.queryForObject(
				"SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'capsule')",
				Boolean.class)).isTrue();
		assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("2");
		assertThat(flyway.info().pending()).isEmpty();
		assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
	}

	@Test
	void doesNotReapplyCompletedMigrations() {
		assertThat(flyway.migrate().migrationsExecuted).isZero();
	}

	@Test
	@Transactional
	void provisionsAccountsWithDistinctSaltedPasswordHashes() {
		String password = "a long test passphrase";
		var first = accounts.provision(" First.User ", AccountSlot.FIRST, password.toCharArray());
		var second = accounts.provision("second.user", AccountSlot.SECOND, password.toCharArray());
		assertThat(first.username()).isEqualTo("first.user");
		assertThat(first.id()).isNotNull().isNotEqualTo(second.id());
		assertThat(first.createdAt()).isNotNull();
		var hashes = jdbcTemplate.queryForList("SELECT password_hash FROM capsule.accounts", String.class);
		assertThat(hashes).hasSize(2).doesNotHaveDuplicates();
		for (String hash : hashes) {
			assertThat(hash).startsWith("{argon2}$argon2id$").doesNotContain(password);
			assertThat(passwordEncoder.matches(password, hash)).isTrue();
			assertThat(passwordEncoder.matches("a different password", hash)).isFalse();
		}
	}

	@Test
	@Transactional
	void rejectsDuplicateUsernamesIgnoringCase() {
		accounts.provision("first.user", AccountSlot.FIRST, "a long test passphrase".toCharArray());
		assertThatThrownBy(() -> accounts.provision("FIRST.USER", AccountSlot.SECOND,
				"another long passphrase".toCharArray()))
				.isInstanceOf(IllegalStateException.class);
	}

	@Test
	@Transactional
	void rejectsAThirdAccount() {
		accounts.provision("first.user", AccountSlot.FIRST, "a long test passphrase".toCharArray());
		accounts.provision("second.user", AccountSlot.SECOND, "another long passphrase".toCharArray());
		assertThatThrownBy(() -> accounts.provision("third.user", AccountSlot.FIRST,
				"a third long passphrase".toCharArray()))
				.isInstanceOf(IllegalStateException.class);
	}

	@Test
	@Transactional
	void rejectsInvalidProvisioningInput() {
		for (String password : new String[] { "", "x".repeat(14), "x".repeat(129) }) {
			assertThatThrownBy(() -> accounts.provision("first.user", AccountSlot.FIRST, password.toCharArray()))
					.isInstanceOf(IllegalArgumentException.class);
		}
		assertThatThrownBy(() -> accounts.provision("invalid user", AccountSlot.FIRST,
				"a long test passphrase".toCharArray())).isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> accounts.provision("first.user", null,
				"a long test passphrase".toCharArray())).isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	@Transactional
	void databasePreventsDuplicateAccountSlots() {
		accounts.provision("first.user", AccountSlot.FIRST, "a long test passphrase".toCharArray());
		assertThatThrownBy(() -> jdbcTemplate.update("""
				INSERT INTO capsule.accounts (id, username, slot, password_hash, created_at)
				SELECT gen_random_uuid(), 'second.user', slot, password_hash, created_at
				FROM capsule.accounts WHERE username = 'first.user'
				"""))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

}
