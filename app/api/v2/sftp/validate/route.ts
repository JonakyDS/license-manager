import { NextRequest, NextResponse } from "next/server";
import SftpClient from "ssh2-sftp-client";

interface SftpCredentials {
  hostname: string;
  port: number;
  username: string;
  password: string;
}

export async function POST(request: NextRequest) {
  const sftp = new SftpClient();

  try {
    const body = await request.json();

    // Validate required fields
    const { hostname, port, username, password } = body as SftpCredentials;

    if (!hostname || !username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields: hostname, username, password",
          },
        },
        { status: 400 }
      );
    }

    const sftpPort = port || 22;

    // Validate port number
    if (typeof sftpPort !== "number" || sftpPort < 1 || sftpPort > 65535) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Port must be a number between 1 and 65535",
          },
        },
        { status: 400 }
      );
    }

    // Attempt to connect with timeout
    await sftp.connect({
      host: hostname,
      port: sftpPort,
      username,
      password,
      readyTimeout: 10000, // 10 second timeout
      retries: 1,
    });

    // Get current working directory to verify connection works
    const cwd = await sftp.cwd();

    // Close the connection
    await sftp.end();

    return NextResponse.json({
      success: true,
      data: {
        hostname,
        port: sftpPort,
        username,
        connected: true,
        currentDirectory: cwd,
      },
      message: "SFTP credentials are valid",
    });
  } catch (error) {
    // Ensure connection is closed on error
    try {
      await sftp.end();
    } catch {
      // Ignore close errors
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Map common errors to user-friendly messages
    let code = "CONNECTION_ERROR";
    let message = errorMessage;

    if (errorMessage.includes("Authentication failed")) {
      code = "AUTH_FAILED";
      message = "Invalid username or password";
    } else if (
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("getaddrinfo")
    ) {
      code = "HOST_NOT_FOUND";
      message = "Hostname could not be resolved";
    } else if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("Connection refused")
    ) {
      code = "CONNECTION_REFUSED";
      message = "Connection refused - check hostname and port";
    } else if (
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("Timed out")
    ) {
      code = "CONNECTION_TIMEOUT";
      message = "Connection timed out - server may be unreachable";
    } else if (errorMessage.includes("EHOSTUNREACH")) {
      code = "HOST_UNREACHABLE";
      message = "Host is unreachable";
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          details:
            process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
      },
      { status: 400 }
    );
  }
}
