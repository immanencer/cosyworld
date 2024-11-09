// Preconfigured  for Image Generation

// Standard Image Generation (1:1 aspect ratio, moderate quality)
const standard = {
    input: {
      prompt: "Your desired prompt here",
      prompt_upsampling: true,
      width: 512,
      height: 512,
      aspect_ratio: "1:1",
      output_format: "jpg",
      output_quality: 80,
      safety_tolerance: 3
    }
  };
  
  // High-Quality Image Generation (16:9 aspect ratio, high quality)
  const highQuality = {
    input: {
      prompt: "Your high-quality prompt here",
      prompt_upsampling: true,
      width: 1440, // Maximum allowed width
      height: 810, // 16:9 aspect ratio
      aspect_ratio: "16:9",
      output_format: "png", // Lossless format
      output_quality: 100, // Best quality for non-PNG outputs
      safety_tolerance: 3 // Moderate safety setting
    }
  };
  
  // Custom Aspect Ratio (Banner, 1280x480)
  const banner = {
    input: {
      prompt: "Your banner image prompt here",
      prompt_upsampling: true,
      width: 1280,
      height: 480,
      aspect_ratio: "custom",
      output_format: "jpg",
      output_quality: 90,
      safety_tolerance: 4 // Slightly less strict for more creative output
    }
  };
  
  // Low-Quality Faster Generation (Quick drafts, 1:1 aspect ratio)
  const fastDraft = {
    input: {
      prompt: "Your fast draft prompt here",
      prompt_upsampling: false, // Disable upsampling for faster generation
      width: 512,
      height: 512,
      aspect_ratio: "1:1",
      output_format: "jpg",
      output_quality: 60, // Lower quality for faster processing
      safety_tolerance: 2 // Stricter safety due to fast processing
    }
  };
  
  // Artistic/Experimental Image Generation (Creative mode, relaxed safety)
  const artistic = {
    input: {
      raw: false,
      aspect_ratio: "3:2",
      output_format: "png",
      output_quality: 90, // High quality for artistic integrity
      safety_tolerance: 5 // Most permissive safety for experimental generation
    }
  };
  
  // Mobile Portrait Image (9:16 aspect ratio, for mobile devices)
  const mobilePortrait = {
    input: {
      prompt: "Your mobile portrait prompt here",
      prompt_upsampling: true,
      width: 720,
      height: 1280,
      aspect_ratio: "9:16",
      output_format: "jpg",
      output_quality: 85,
      safety_tolerance: 3
    }
  };
  
  // Family-Friendly Image Generation (Strict safety settings)
  const familyFriendly = {
    input: {
      prompt: "Your family-friendly prompt here",
      prompt_upsampling: true,
      width: 512,
      height: 512,
      aspect_ratio: "1:1",
      output_format: "jpg",
      output_quality: 80,
      safety_tolerance: 1 // Strictest safety setting
    }
  };
  
  // Export all settings for use in other files
  export default {
    standard,
    highQuality,
    banner,
    fastDraft,
    artistic,
    mobilePortrait,
    familyFriendly
  };
  