package com.qlks;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.boot.autoconfigure.cassandra.CassandraAutoConfiguration;
import org.springframework.boot.autoconfigure.data.cassandra.CassandraDataAutoConfiguration;

@SpringBootApplication(exclude = {
        CassandraAutoConfiguration.class,
        CassandraDataAutoConfiguration.class
})
public class QlksApplication {

    public static void main(String[] args) {
        SpringApplication.run(QlksApplication.class, args);
        System.out.println("==========================================================");
        System.out.println("UNG DUNG QUAN LY KHACH SAN (QLKS - CASSANDRA) DA KHOI CHAY");
        System.out.println("Truy cap giao dien tai: http://localhost:8080");
        System.out.println("==========================================================");
    }
}
