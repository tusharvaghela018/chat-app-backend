import { Request } from "express";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";

export interface DeviceInfo {
    device_type: "desktop" | "mobile" | "tablet" | "browser" | string;
    device_name: string;
    browser: string;
    os: string;
    ip_address: string;
    location: string;
    city: string | null;
    region: string | null;
    country: string | null;
    country_code: string | null;
}

export const extractClientIp = (req: Request): string => {
    let ip = (
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        (req.headers["x-real-ip"] as string) ||
        req.socket.remoteAddress ||
        req.ip ||
        "127.0.0.1"
    );

    // Strip IPv6-mapped IPv4 prefix
    if (ip.startsWith("::ffff:")) {
        ip = ip.substring(7);
    }
    if (ip === "::1") {
        ip = "127.0.0.1";
    }

    return ip;
};

export const isPrivateOrLocalIp = (ip: string): boolean => {
    return (
        ip === "127.0.0.1" ||
        ip === "localhost" ||
        ip === "::1" ||
        ip.startsWith("192.168.") ||
        ip.startsWith("10.") ||
        ip.startsWith("172.16.") ||
        ip.startsWith("172.17.") ||
        ip.startsWith("172.18.") ||
        ip.startsWith("172.19.") ||
        ip.startsWith("172.2") ||
        ip.startsWith("172.30.") ||
        ip.startsWith("172.31.")
    );
};

export const extractDeviceInfo = (req: Request): DeviceInfo => {
    const userAgent = (req.headers["user-agent"] as string) || "";
    const ip = extractClientIp(req);

    // Parse UA
    const parser = new UAParser(userAgent);
    const parsedBrowser = parser.getBrowser();
    const parsedOs = parser.getOS();
    const parsedDevice = parser.getDevice();

    const browserName = parsedBrowser.name || "Web Browser";
    const browserMajor = parsedBrowser.version ? ` ${parsedBrowser.version.split(".")[0]}` : "";
    const browser = `${browserName}${browserMajor}`;

    let osName = parsedOs.name || "Unknown OS";
    let osVersion = parsedOs.version ? ` ${parsedOs.version}` : "";

    // Windows 11 Detection:
    // Chromium User-Agent strings are permanently frozen at "Windows NT 10.0".
    // Microsoft sends "Sec-CH-UA-Platform-Version" (major version >= 13 is Windows 11).
    const clientPlatformVersion = (
        (req.headers["sec-ch-ua-platform-version"] as string) ||
        (req.headers["x-client-platform-version"] as string) ||
        ""
    ).replace(/"/g, "").trim();

    const isExplicitWin11 = (req.headers["x-client-os"] as string) === "Windows 11";

    if (osName.toLowerCase().includes("windows")) {
        const majorVersion = parseInt(clientPlatformVersion.split(".")[0], 10);
        if (majorVersion >= 13 || isExplicitWin11) {
            osName = "Windows";
            osVersion = "11";
        }
    }

    const os = `${osName} ${osVersion}`.trim();

    // Determine device type
    let device_type = parsedDevice.type || "desktop";
    if (!parsedDevice.type) {
        if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
            device_type = /ipad|tablet/i.test(userAgent) ? "tablet" : "mobile";
        } else {
            device_type = "desktop";
        }
    }

    // Determine friendly device name
    let device_name = "";
    if (parsedDevice.vendor || parsedDevice.model) {
        device_name = [parsedDevice.vendor, parsedDevice.model].filter(Boolean).join(" ");
    } else if (osName.toLowerCase().includes("windows")) {
        device_name = "Windows PC";
    } else if (osName.toLowerCase().includes("mac")) {
        device_name = "Apple Mac";
    } else if (osName.toLowerCase().includes("linux")) {
        device_name = "Linux PC";
    } else if (osName.toLowerCase().includes("android")) {
        device_name = "Android Device";
    } else if (osName.toLowerCase().includes("ios")) {
        device_name = "Apple iOS Device";
    } else {
        device_name = `${browserName} on ${osName}`;
    }

    // Resolve GeoIP
    let city: string | null = null;
    let region: string | null = null;
    let country: string | null = null;
    let country_code: string | null = null;
    let location = "Local Network";

    if (!isPrivateOrLocalIp(ip)) {
        const geo = geoip.lookup(ip);
        if (geo) {
            city = geo.city || null;
            region = geo.region || null;
            country = geo.country || null;
            country_code = geo.country || null;

            const locParts = [city, region, country].filter(Boolean);
            if (locParts.length > 0) {
                location = locParts.join(", ");
            }
        } else {
            location = "Unknown Location";
        }
    } else {
        // Fallback for Localhost / Development:
        const clientTz = (req.headers["x-client-timezone"] as string)?.trim();
        const cfCountry = req.headers["cf-ipcountry"] as string;

        if (clientTz) {
            const parts = clientTz.split("/");
            const cityName = parts[1]?.replace(/_/g, " ") || clientTz;
            const regionName = parts[0]?.replace(/_/g, " ") || "";
            city = cityName;
            region = regionName;
            location = `${cityName}, ${regionName}`;
        } else if (cfCountry) {
            country_code = cfCountry;
            country = cfCountry;
            location = `Local Network (${cfCountry})`;
        } else {
            location = "Localhost (Development)";
        }
    }

    return {
        device_type,
        device_name,
        browser,
        os,
        ip_address: ip,
        location,
        city,
        region,
        country,
        country_code,
    };
};
