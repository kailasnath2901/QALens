import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    // Extract public_id from URL
    // e.g., https://res.cloudinary.com/demo/image/upload/v1234567890/folder/file.png
    // public_id is 'folder/file'
    const urlParts = imageUrl.split("/upload/");
    if (urlParts.length < 2) {
      return NextResponse.json({ error: "Invalid Cloudinary URL" }, { status: 400 });
    }

    const pathWithVersion = urlParts[1];
    // Remove the version folder (e.g., v1234567890/)
    const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, "");
    
    // Remove the file extension
    const dotIndex = pathWithoutVersion.lastIndexOf(".");
    const publicId = dotIndex !== -1 ? pathWithoutVersion.substring(0, dotIndex) : pathWithoutVersion;

    const result = await cloudinary.uploader.destroy(publicId);

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error("Cloudinary delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete image" },
      { status: 500 }
    );
  }
}
