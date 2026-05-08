package com.onlinejudge.result_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// This is Result Service which automatically called once result is ready
@SpringBootApplication
public class ResultServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ResultServiceApplication.class, args);
	}

}
