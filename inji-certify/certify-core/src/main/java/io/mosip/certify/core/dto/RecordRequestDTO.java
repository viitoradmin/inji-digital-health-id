package io.mosip.certify.core.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Request body for creating or updating a person record")
public class RecordRequestDTO {

    @NotBlank(message = "firstName is required")
    @Schema(description = "Given name", example = "Shailesh", requiredMode = Schema.RequiredMode.REQUIRED)
    private String firstName;

    @NotBlank(message = "lastName is required")
    @Schema(description = "Family name", example = "Gojiya", requiredMode = Schema.RequiredMode.REQUIRED)
    private String lastName;

    @Schema(description = "Date of birth (ISO-8601 date)", example = "1990-05-15")
    private LocalDate dateOfBirth;

    @Schema(description = "Gender", example = "Male")
    private String gender;

    @Schema(description = "Phone number", example = "+919876543210")
    private String phoneNumber;

    @Email(message = "email must be a valid email address")
    @Schema(description = "Email address (unique)", example = "shailesh@example.com")
    private String email;
}
