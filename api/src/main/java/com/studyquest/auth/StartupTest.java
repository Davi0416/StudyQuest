package com.studyquest.auth;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.ConfigProvider;

@ApplicationScoped
public class StartupTest {
    void onStart(@Observes StartupEvent ev) {
        System.out.println("====== STUDYQUEST_DESKTOP: " + System.getenv("STUDYQUEST_DESKTOP") + " ======");
        System.out.println("====== jdbc url: " + ConfigProvider.getConfig().getOptionalValue("quarkus.datasource.jdbc.url", String.class).orElse("none") + " ======");
    }
}
