import { cloudinary } from "../config/cloudinary";

type ResourceType = "image" | "video" | "raw";

/**
 * Deletes a single asset from Cloudinary by its public_id.
 *
 * @param publicId     - The Cloudinary public_id of the asset (e.g. "solar-platform/categories/abc123")
 * @param resourceType - "image" | "video" | "raw"  (use "video" for audio files too)
 * @returns            true if deleted, false if not found
 */
const deleteFromCloudinary = async (
  publicId: string,
  resourceType: ResourceType = "image"
): Promise<boolean> => {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });

  return result.result === "ok";
};

/**
 * Deletes multiple assets from Cloudinary in parallel.
 *
 * @param publicIds    - Array of Cloudinary public_ids
 * @param resourceType - "image" | "video" | "raw"
 * @returns            Array of { publicId, deleted } objects
 */
export const deleteManyFromCloudinary = async (
  publicIds: string[],
  resourceType: ResourceType = "image"
): Promise<Array<{ publicId: string; deleted: boolean }>> => {
  const results = await Promise.allSettled(
    publicIds.map((id) => deleteFromCloudinary(id, resourceType))
  );

  return results.map((result, index) => ({
    publicId: publicIds[index],
    deleted: result.status === "fulfilled" && result.value === true,
  }));
};

export default deleteFromCloudinary;
