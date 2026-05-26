package io.mosip.certify.core.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Person record returned by the Records API")
public class RecordResponseDTO {

    @Schema(description = "Record identifier (server-generated UUID)", example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
    private String id;

    @Schema(description = "Given name", example = "Shailesh")
    private String firstName;

    @Schema(description = "Family name", example = "Gojiya")
    private String lastName;

    @Schema(description = "Date of birth (ISO-8601 date)", example = "1990-05-15")
    private LocalDate dateOfBirth;

    @Schema(description = "Gender", example = "Male")
    private String gender;

    @Schema(description = "Phone number", example = "+919876543210")
    private String phoneNumber;

    @Schema(description = "Email address", example = "shailesh@example.com")
    private String email;

    @Schema(description = "Creation timestamp")
    private LocalDateTime createdAt;

    @Schema(description = "Last update timestamp")
    private LocalDateTime updatedAt;
}
