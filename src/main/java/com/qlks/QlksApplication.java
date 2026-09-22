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
        System.out.println("🚀 ỨNG DỤNG QUẢN LÝ KHÁCH SẠN (QLKS - CASSANDRA) ĐÃ KHỞI CHẠY");
        System.out.println("🌐 Truy cập giao diện tại: http://localhost:8080");
        System.out.println("==========================================================");
    }
}
