/**
 * Strict File Validator
 * Validates magic numbers (file signatures), MIME types, and file extensions
 * to prevent disguised malware/virus files from being uploaded.
 * 
 * Enforces strict bidirectional matching:
 * If someone renames a .pdf to .jpg, or an .exe to .png, or an .mp3 to .pdf,
 * it is detected and rejected immediately.
 */

export interface ValidationResult {
    isValid: boolean
    category: "image" | "pdf" | "audio" | "document" | "unknown"
    detectedMime: string
    error?: string
}

const DANGEROUS_EXTENSIONS = new Set([
    "exe", "bat", "cmd", "sh", "vbs", "js", "mjs", "jar", "scr", "pif", "com",
    "hta", "cpl", "msi", "msp", "php", "phtml", "py", "pl", "cgi", "ps1", "wsf",
    "vbe", "jse", "reg", "iso", "dll", "sys", "drv", "ocx"
])

const EXTENSION_CATEGORY_MAP: Record<string, "image" | "pdf" | "audio" | "document"> = {
    // Images
    jpg: "image",
    jpeg: "image",
    png: "image",
    webp: "image",
    gif: "image",
    svg: "image",

    // PDF
    pdf: "pdf",

    // Documents
    doc: "document",
    docx: "document",
    xls: "document",
    xlsx: "document",
    ppt: "document",
    pptx: "document",
    txt: "document",

    // Audio
    webm: "audio",
    mp3: "audio",
    wav: "audio",
    ogg: "audio",
    m4a: "audio",
}

interface DetectedType {
    category: "image" | "pdf" | "audio" | "document"
    mime: string
    format: string
}

/**
 * Detect the real file type solely from its raw byte signature (magic bytes).
 */
function detectRealFileType(buffer: Buffer, declaredMime: string): DetectedType | null {
    if (!buffer || buffer.length < 2) return null

    // 1. JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { category: "image", mime: "image/jpeg", format: "jpeg" }
    }

    // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return { category: "image", mime: "image/png", format: "png" }
    }

    // 3. GIF: GIF87a or GIF89a (47 49 46 38)
    if (
        buffer.length >= 4 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
    ) {
        return { category: "image", mime: "image/gif", format: "gif" }
    }

    // 4. WEBP: RIFF (bytes 0-3: 52 49 46 46) and WEBP (bytes 8-11: 57 45 42 50)
    if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return { category: "image", mime: "image/webp", format: "webp" }
    }

    // 5. PDF: %PDF- (25 50 44 46)
    if (
        buffer.length >= 4 &&
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46
    ) {
        return { category: "pdf", mime: "application/pdf", format: "pdf" }
    }

    // 6. WebM / Matroska: 1A 45 DF A3
    if (
        buffer.length >= 4 &&
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
    ) {
        return { category: "audio", mime: "audio/webm", format: "webm" }
    }

    // 7. OGG: OggS (4F 67 67 53)
    if (
        buffer.length >= 4 &&
        buffer[0] === 0x4f &&
        buffer[1] === 0x67 &&
        buffer[2] === 0x67 &&
        buffer[3] === 0x53
    ) {
        return { category: "audio", mime: "audio/ogg", format: "ogg" }
    }

    // 8. MP3 with ID3 tag: ID3 (49 44 33)
    if (buffer.length >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
        return { category: "audio", mime: "audio/mpeg", format: "mp3" }
    }

    // 9. MP3 without ID3 (MPEG audio frame sync: FF FB, FF F3, FF F2)
    if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
        return { category: "audio", mime: "audio/mpeg", format: "mp3" }
    }

    // 10. WAV: RIFF....WAVE
    if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x41 &&
        buffer[10] === 0x56 &&
        buffer[11] === 0x45
    ) {
        return { category: "audio", mime: "audio/wav", format: "wav" }
    }

    // 11. M4A / MP4 Audio: ftyp at offset 4
    if (
        buffer.length >= 8 &&
        buffer[4] === 0x66 &&
        buffer[5] === 0x74 &&
        buffer[6] === 0x79 &&
        buffer[7] === 0x70
    ) {
        return { category: "audio", mime: "audio/mp4", format: "m4a" }
    }

    // 12. ZIP-based Office OpenXML (DOCX, XLSX, PPTX): PK\x03\x04
    if (
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
    ) {
        return {
            category: "document",
            mime: declaredMime || "application/vnd.openxmlformats-officedocument",
            format: "zip-document",
        }
    }

    // 13. Legacy Office (DOC, XLS, PPT): OLE Compound File (D0 CF 11 E0 A1 B1 1A E1) or RTF ({\rtf)
    if (
        buffer.length >= 8 &&
        buffer[0] === 0xd0 &&
        buffer[1] === 0xcf &&
        buffer[2] === 0x11 &&
        buffer[3] === 0xe0 &&
        buffer[4] === 0xa1 &&
        buffer[5] === 0xb1 &&
        buffer[6] === 0x1a &&
        buffer[7] === 0xe1
    ) {
        return { category: "document", mime: declaredMime || "application/msword", format: "ole-document" }
    }

    if (
        buffer.length >= 5 &&
        buffer[0] === 0x7b &&
        buffer[1] === 0x5c &&
        buffer[2] === 0x72 &&
        buffer[3] === 0x74 &&
        buffer[4] === 0x66
    ) {
        return { category: "document", mime: "application/rtf", format: "rtf" }
    }

    // 14. SVG: XML text starting with <svg or <?xml ... <svg
    const headerSample = buffer.toString("utf-8", 0, Math.min(buffer.length, 2048)).toLowerCase()
    if (headerSample.includes("<svg") && !headerSample.includes("<script") && !headerSample.includes("javascript:")) {
        return { category: "image", mime: "image/svg+xml", format: "svg" }
    }

    // 15. Plain text: .txt (UTF-8/ASCII without null control bytes in first 512 bytes)
    const sample = buffer.slice(0, Math.min(buffer.length, 512))
    const hasNull = sample.some((byte) => byte === 0)
    if (!hasNull) {
        // Also check it doesn't look like an executable or HTML script
        if (
            !headerSample.includes("<script") &&
            !headerSample.includes("#!/bin/") &&
            !headerSample.includes("@echo off")
        ) {
            return { category: "document", mime: "text/plain", format: "txt" }
        }
    }

    return null
}

export function validateFileBuffer(
    buffer: Buffer,
    declaredMime: string,
    filename: string
): ValidationResult {
    if (!buffer || buffer.length === 0) {
        return { isValid: false, category: "unknown", detectedMime: "", error: "File buffer is empty" }
    }

    // ── 1. Check filename and extension ───────────────────────────────────
    const parts = filename.toLowerCase().split(".")
    if (parts.length < 2) {
        return { isValid: false, category: "unknown", detectedMime: "", error: "File must have a valid extension" }
    }

    const ext = parts[parts.length - 1]

    // Disallow double extension evasion (e.g., image.exe.jpg or virus.sh.pdf)
    for (let i = 1; i < parts.length - 1; i++) {
        if (DANGEROUS_EXTENSIONS.has(parts[i])) {
            return {
                isValid: false,
                category: "unknown",
                detectedMime: "",
                error: `Security Alert: Suspicious double extension detected (.${parts[i]}.${ext})`,
            }
        }
    }

    if (DANGEROUS_EXTENSIONS.has(ext)) {
        return {
            isValid: false,
            category: "unknown",
            detectedMime: "",
            error: `Security Alert: Executable file extension (.${ext}) is strictly prohibited`,
        }
    }

    const expectedCategory = EXTENSION_CATEGORY_MAP[ext]
    if (!expectedCategory) {
        return {
            isValid: false,
            category: "unknown",
            detectedMime: "",
            error: `File type .${ext} is not supported. Allowed formats: images (JPG, PNG, WEBP, GIF, SVG), PDFs, documents (DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT), and audio notes.`,
        }
    }

    // ── 2. Explicitly block binary executable signatures ───────────────────
    // Windows PE executable (MZ header: 4D 5A)
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
        return {
            isValid: false,
            category: "unknown",
            detectedMime: "application/x-msdownload",
            error: "Security Alert: Executable binary (MZ header) disguised as another file type!",
        }
    }

    // Linux ELF binary: 7F 45 4C 46
    if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
        return {
            isValid: false,
            category: "unknown",
            detectedMime: "application/x-executable",
            error: "Security Alert: Linux executable binary (ELF header) detected!",
        }
    }

    // Java class binary: CA FE BA BE
    if (buffer.length >= 4 && buffer[0] === 0xca && buffer[1] === 0xfe && buffer[2] === 0xba && buffer[3] === 0xbe) {
        return {
            isValid: false,
            category: "unknown",
            detectedMime: "application/java-vm",
            error: "Security Alert: Compiled Java binary disguised as another file type!",
        }
    }

    // ── 3. Detect Real File Type from Magic Bytes ──────────────────────────
    const detected = detectRealFileType(buffer, declaredMime)

    if (!detected) {
        return {
            isValid: false,
            category: "unknown",
            detectedMime: "",
            error: `Security Alert: File named as .${ext} does not contain a valid, authentic ${expectedCategory.toUpperCase()} header. Corrupted or disguised files are blocked.`,
        }
    }

    // ── 4. STRICT EXTENSION VS REAL CONTENT CHECK ──────────────────────────
    // What if the user changed the extension (e.g. renamed a PDF to .jpg or audio to .pdf)?
    if (detected.category !== expectedCategory) {
        return {
            isValid: false,
            category: "unknown",
            detectedMime: detected.mime,
            error: `Security Alert: Mismatched file type detected! Actual file content is a ${detected.category.toUpperCase()} (${detected.mime}), but the file was uploaded with a .${ext} extension. Renaming extensions to disguise file types is strictly prohibited.`,
        }
    }

    // Strict sub-format validation within image category
    if (expectedCategory === "image") {
        if ((ext === "jpg" || ext === "jpeg") && detected.format !== "jpeg") {
            return {
                isValid: false,
                category: "unknown",
                detectedMime: detected.mime,
                error: `Security Alert: File has .${ext} extension but actual content is ${detected.format.toUpperCase()} image.`,
            }
        }
        if (ext === "png" && detected.format !== "png") {
            return {
                isValid: false,
                category: "unknown",
                detectedMime: detected.mime,
                error: `Security Alert: File has .png extension but actual content is ${detected.format.toUpperCase()} image.`,
            }
        }
        if (ext === "webp" && detected.format !== "webp") {
            return {
                isValid: false,
                category: "unknown",
                detectedMime: detected.mime,
                error: `Security Alert: File has .webp extension but actual content is ${detected.format.toUpperCase()} image.`,
            }
        }
        if (ext === "gif" && detected.format !== "gif") {
            return {
                isValid: false,
                category: "unknown",
                detectedMime: detected.mime,
                error: `Security Alert: File has .gif extension but actual content is ${detected.format.toUpperCase()} image.`,
            }
        }
        if (ext === "svg" && detected.format !== "svg") {
            return {
                isValid: false,
                category: "unknown",
                detectedMime: detected.mime,
                error: `Security Alert: File has .svg extension but is not a valid SVG image.`,
            }
        }
    }

    // Strict sub-format validation for PDF
    if (expectedCategory === "pdf" && detected.format !== "pdf") {
        return {
            isValid: false,
            category: "unknown",
            detectedMime: detected.mime,
            error: `Security Alert: File has .pdf extension but does not match authentic PDF signature.`,
        }
    }

    // All checks passed!
    return {
        isValid: true,
        category: detected.category,
        detectedMime: detected.mime,
    }
}
