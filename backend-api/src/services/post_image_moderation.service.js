const axios = require("axios");

const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";
const MAX_RESULTS = 10;
const OFF_TOPIC_LABELS = [
  "animal",
  "pet",
  "dog",
  "cat",
  "bird",
  "fish",
  "wildlife",
  "landscape",
  "scenery",
  "nature",
  "mountain",
  "beach",
  "forest",
  "ocean",
  "sea",
  "coastline",
  "waterfall",
  "lake",
  "river",
  "desert",
  "sky",
  "rural area",
  "grassland",
  "plantation",
  "hill station",
  "agriculture",
  "field",
  "tourist attraction",
  "village",
  "meadow",
  "horse",
  "cow",
  "sheep",
  "goat",
  "chicken",
  "duck",
  "pig",
  "reptile",
  "insect",
  "food",
  "dish",
  "meal",
  "fruit",
  "vegetable",
  "dessert",
  "beverage",
  "vehicle",
  "car",
  "motorcycle",
  "bicycle",
  "bus",
  "truck",
  "aircraft",
  "boat",
  "ship",
  "train",
  "sports",
  "sport",
  "football",
  "soccer",
  "basketball",
  "musical instrument",
  "concert",
  "logo",
  "brand",
  "trademark",
  "poster",
  "screenshot",
  "document",
  "infographic",
  "chart",
  "meme",
];
const OFF_TOPIC_LABELS_VI = {
  animal: "động vật",
  pet: "thú cưng",
  dog: "chó",
  cat: "mèo",
  bird: "chim",
  fish: "cá",
  wildlife: "động vật hoang dã",
  landscape: "phong cảnh",
  scenery: "cảnh quan",
  nature: "thiên nhiên",
  mountain: "núi",
  beach: "bãi biển",
  forest: "rừng",
  ocean: "đại dương",
  sea: "biển",
  coastline: "bờ biển",
  waterfall: "thác nước",
  lake: "hồ",
  river: "sông",
  desert: "sa mạc",
  sky: "bầu trời",
  "rural area": "khu vực nông thôn",
  grassland: "đồng cỏ",
  plantation: "đồn điền",
  "hill station": "khu nghỉ dưỡng vùng đồi",
  agriculture: "nông nghiệp",
  field: "cánh đồng",
  "tourist attraction": "điểm tham quan",
  village: "làng",
  meadow: "đồng cỏ",
  horse: "ngựa",
  cow: "bò",
  sheep: "cừu",
  goat: "dê",
  chicken: "gà",
  duck: "vịt",
  pig: "lợn",
  reptile: "bò sát",
  insect: "côn trùng",
  food: "thức ăn",
  dish: "món ăn",
  meal: "bữa ăn",
  fruit: "trái cây",
  vegetable: "rau củ",
  dessert: "món tráng miệng",
  beverage: "đồ uống",
  vehicle: "phương tiện giao thông",
  car: "ô tô",
  motorcycle: "xe máy",
  bicycle: "xe đạp",
  bus: "xe buýt",
  truck: "xe tải",
  aircraft: "máy bay",
  boat: "thuyền",
  ship: "tàu thủy",
  train: "tàu hỏa",
  sports: "thể thao",
  sport: "môn thể thao",
  football: "bóng đá",
  soccer: "bóng đá",
  basketball: "bóng rổ",
  "musical instrument": "nhạc cụ",
  concert: "buổi hòa nhạc",
  logo: "biểu trưng",
  brand: "thương hiệu",
  trademark: "nhãn hiệu",
  poster: "áp phích",
  screenshot: "ảnh chụp màn hình",
  document: "tài liệu",
  infographic: "đồ họa thông tin",
  chart: "biểu đồ",
  meme: "ảnh chế",
  "đồ họa chữ/thông tin": "đồ họa chữ/thông tin",
};
const OFF_TOPIC_THRESHOLD = 0.78;
const RELEVANT_THRESHOLD = 0.7;
const STRONG_ROOM_THRESHOLD = 0.75;
const ROOM_HOME_LABELS = [
  "room",
  "bedroom",
  "living room",
  "house",
  "home",
  "apartment",
  "real estate",
  "property",
  "accommodation",
  "kitchen",
  "bathroom",
];
const ROOM_DETAIL_LABELS = [
  "bed",
  "furniture",
  "sofa",
  "couch",
  "chair",
  "table",
  "desk",
  "lamp",
  "interior design",
  "interior",
  "window",
  "door",
  "floor",
  "wall",
  "ceiling",
  "lighting",
  "wardrobe",
  "cabinet",
];

function isCloudinaryImageUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      /^\/[^/]+\/image\/upload\//.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function getImageRequest(image) {
  if (typeof image !== "string") {
    throw new Error("Định dạng ảnh không hợp lệ.");
  }
  const match = image.match(
    /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/,
  );
  if (match) {
    return { content: match[1].replace(/\s/g, "") };
  }
  if (isCloudinaryImageUrl(image)) {
    return { source: { imageUri: image } };
  }
  throw new Error("Ảnh không có định dạng được hỗ trợ để kiểm duyệt.");
}

function getLabelScore(label) {
  return Math.max(Number(label.score) || 0, Number(label.topicality) || 0);
}

function getVietnameseOffTopicLabel(label) {
  const normalizedLabel = String(label || "").trim().toLocaleLowerCase("en");
  return OFF_TOPIC_LABELS_VI[normalizedLabel] ?? "nội dung không phù hợp";
}

function findLabel(labels, relevantLabels) {
  return labels
    .filter((label) => {
      const description = String(label.description || "").toLocaleLowerCase("en");
      return relevantLabels.some(
        (candidate) => description === candidate || description.includes(candidate),
      );
    })
    .sort((left, right) => getLabelScore(right) - getLabelScore(left))[0];
}

function getRoomEvidenceScore(labels) {
  const directLabel = findLabel(labels, ROOM_HOME_LABELS);
  const directScore = directLabel ? getLabelScore(directLabel) : 0;
  const roomDetails = labels
    .filter((label) => {
      const description = String(label.description || "").toLocaleLowerCase("en");
      return ROOM_DETAIL_LABELS.some(
        (candidate) =>
          description === candidate || description.includes(candidate),
      );
    })
    .sort((left, right) => getLabelScore(right) - getLabelScore(left));
  const distinctDetails = [];
  const seenDescriptions = new Set();
  for (const label of roomDetails) {
    const description = String(label.description || "").trim().toLocaleLowerCase("en");
    if (description && !seenDescriptions.has(description)) {
      seenDescriptions.add(description);
      distinctDetails.push(label);
    }
    if (distinctDetails.length === 2) break;
  }
  const detailScore =
    distinctDetails.length >= 2
      ? Math.min(
          1,
          getLabelScore(distinctDetails[0]) + getLabelScore(distinctDetails[1]),
        )
      : 0;
  return Math.max(directScore, detailScore);
}

function manualReview(category, confidence = null) {
  return {
    blocked: true,
    category,
    findings: [{ category, confidence }],
  };
}

function reject(category, confidence = null, label = null) {
  return {
    blocked: true,
    category,
    confidence,
    label,
    findings: [{ category, confidence, ...(label ? { label } : {}) }],
  };
}

function classifyResponse(response) {
  if (
    response?.error ||
    !response?.safeSearchAnnotation ||
    (response?.labelAnnotations != null &&
      !Array.isArray(response.labelAnnotations))
  ) {
    return manualReview("IMAGE_VERIFICATION_FAILED");
  }

  const safeSearch = response.safeSearchAnnotation;
  if (safeSearch.adult === "VERY_LIKELY") {
    return reject("ADULT_CONTENT", safeSearch.adult);
  }
  if (
    ["LIKELY", "VERY_LIKELY"].includes(safeSearch.adult) ||
    ["LIKELY", "VERY_LIKELY"].includes(safeSearch.racy)
  ) {
    return manualReview("SENSITIVE_CONTENT_SUSPECTED");
  }

  const labels = response.labelAnnotations ?? [];
  const unrelated = findLabel(labels, OFF_TOPIC_LABELS);
  const unrelatedScore = unrelated ? getLabelScore(unrelated) : 0;
  const roomEvidenceScore = getRoomEvidenceScore(labels);
  const hasRoomEvidence = roomEvidenceScore >= RELEVANT_THRESHOLD;
  const graphicLabel = findLabel(labels, ["graphics", "graphic design"]);
  const textLabel = findLabel(labels, ["font", "typography"]);
  const graphicScore = graphicLabel ? getLabelScore(graphicLabel) : 0;
  const textScore = textLabel ? getLabelScore(textLabel) : 0;

  if (
    graphicScore >= 0.55 &&
    textScore >= 0.75 &&
    roomEvidenceScore < STRONG_ROOM_THRESHOLD
  ) {
    return reject(
      "OFF_TOPIC_IMAGE",
      Math.min(graphicScore, textScore),
      "đồ họa chữ/thông tin",
    );
  }

  if (
    unrelatedScore >= OFF_TOPIC_THRESHOLD &&
    (!hasRoomEvidence || unrelatedScore >= roomEvidenceScore + 0.15)
  ) {
    return reject(
      "OFF_TOPIC_IMAGE",
      unrelatedScore,
      unrelated.description,
    );
  }

  return {
    blocked: false,
    category: null,
    findings: [],
  };
}

async function classifyImage(image, apiKey) {
  const response = await axios.post(
    VISION_ENDPOINT,
    {
      requests: [
        {
          image: getImageRequest(image),
          features: [
            { type: "LABEL_DETECTION", maxResults: MAX_RESULTS },
            { type: "SAFE_SEARCH_DETECTION" },
          ],
        },
      ],
    },
    {
      params: { key: apiKey },
      timeout: 20000,
      maxBodyLength: 12 * 1024 * 1024,
    },
  );
  return classifyResponse(response.data?.responses?.[0]);
}

async function inspectPostImages(images = []) {
  const payloadImages = images.filter(Boolean);
  if (payloadImages.length === 0) {
    return { blocked: false, category: null, findings: [] };
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY?.trim();
  if (!apiKey || apiKey === "điền_key_vào_đây") {
    console.error("[ImageModeration] Google Vision API key is not configured.");
    return manualReview("IMAGE_VERIFICATION_FAILED");
  }

  const findings = [];
  for (const image of payloadImages) {
    try {
      const result = await classifyImage(image, apiKey);
      if (result.blocked) return result;
      findings.push(...result.findings);
    } catch (error) {
      console.error("[ImageModeration] Google Vision request failed.", {
        status: error.response?.status ?? null,
        code: error.code ?? null,
      });
      return manualReview("IMAGE_VERIFICATION_FAILED");
    }
  }

  if (findings.length > 0) {
    return {
      blocked: true,
      category: findings[0].category,
      findings,
    };
  }

  return {
    blocked: false,
    category: null,
    findings: [],
  };
}

module.exports = {
  inspectPostImages,
  isCloudinaryImageUrl,
  classifyResponse,
  getVietnameseOffTopicLabel,
};
