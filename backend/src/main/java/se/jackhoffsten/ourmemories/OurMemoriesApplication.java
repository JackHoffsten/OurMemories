package se.jackhoffsten.ourmemories;

import java.util.Arrays;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class OurMemoriesApplication {

    public static void main(String[] args) {
        var application = new SpringApplication(OurMemoriesApplication.class);
        if (Arrays.asList(args).contains("--provision-account")) {
            application.setWebApplicationType(WebApplicationType.NONE);
            application.setAdditionalProfiles("provision");
            try (var context = application.run(args)) {
                return;
            }
        }
        application.run(args);
    }
}
