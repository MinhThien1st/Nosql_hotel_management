package com.qlks.config;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.CqlSessionBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Cấu hình kết nối DataStax Astra DB (Apache Cassandra)
 * Quản lý vòng đời CqlSession Singleton Bean
 * Phụ trách: Thành viên 1 (Trưởng nhóm)
 */
@Configuration
public class CassandraConfig {

    private static final Logger log = LoggerFactory.getLogger(CassandraConfig.class);

    @Value("${astra.db.secure-connect-bundle-path:astra-creds/secure-connect-hotel-db.zip}")
    private String bundlePath;

    @Value("${astra.db.token:}")
    private String token;

    @Value("${astra.db.keyspace:default_keyspace}")
    private String keyspace;

    @Value("${astra.db.enable-fallback:true}")
    private boolean enableFallback;

    private CqlSession sessionInstance;

    @Bean
    public CqlSession cqlSession() {
        if (sessionInstance != null && !sessionInstance.isClosed()) {
            return sessionInstance;
        }

        try {
            Path path = Paths.get(bundlePath);
            File bundleFile = path.toFile();

            if (!bundleFile.exists() || token == null || token.isBlank() || token.contains("YOUR_TOKEN_HERE")) {
                log.warn("⚠️ [Astra DB Config] Chưa tìm thấy file bundle '{}' hoặc Token chưa hợp lệ.", bundlePath);
                log.warn("⚠️ Ứng dụng sẽ hoạt động ở chế độ Mock In-Memory Mode để hỗ trợ Demo và phát triển cục bộ.");
                return null;
            }

            log.info("🔌 Đang kết nối tới DataStax Astra DB qua Secure Bundle: {}", bundleFile.getAbsolutePath());

            CqlSessionBuilder builder = CqlSession.builder()
                    .withCloudSecureConnectBundle(path)
                    .withAuthCredentials("token", token.trim());

            if (keyspace != null && !keyspace.isBlank()) {
                builder.withKeyspace(keyspace.trim());
            }

            sessionInstance = builder.build();
            log.info("✅ KẾT NỐI DATASTAX ASTRA DB THÀNH CÔNG! Keyspace: {}", keyspace);
            return sessionInstance;
        } catch (Exception e) {
            log.error("❌ Lỗi khi khởi tạo kết nối Astra DB: {}", e.getMessage());
            if (enableFallback) {
                log.warn("⚠️ Chuyển sang chế độ Mock Data In-Memory an toàn để ứng dụng không bị dừng.");
                return null;
            } else {
                throw new RuntimeException("Không thể kết nối đến Astra DB", e);
            }
        }
    }
}
