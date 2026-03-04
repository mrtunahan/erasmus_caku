package com.takip;

import java.util.Collections;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "com.takip")
@EnableScheduling
public class DuyuruPaneliApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(DuyuruPaneliApplication.class);
        app.setDefaultProperties(Collections.singletonMap("server.port", "8085"));
        app.run(args);
    }
}
