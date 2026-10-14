package com.monkeycoffedevs.cmd;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CmdApplication {

	public static void main(String[] args) {
		SpringApplication.run(CmdApplication.class, args);
	}

}
