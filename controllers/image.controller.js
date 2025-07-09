const axios = require("axios");
const { Image } = require("../models");
const aiConfig = require("../config/ai.config");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Op } = require("sequelize");

// Función mejorada para manejar el base64
function cleanBase64Data(b64Data) {
  // Si viene como literal de Python (b'...')
  if (b64Data.startsWith("b'") && b64Data.endsWith("'")) {
    return b64Data.slice(2, -1);
  }
  // Si viene con prefijo data:image
  if (b64Data.startsWith("data:image")) {
    return b64Data.split(",")[1];
  }
  return b64Data;
}

async function saveBase64Image(b64Data, userId) {
  try {
    // 1. Limpiar los datos base64
    const cleanBase64 = cleanBase64Data(b64Data);

    // 2. Validar formato base64
    if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
      throw new Error("Formato base64 no válido");
    }

    // 3. Decodificar
    const imageBuffer = Buffer.from(cleanBase64, "base64");

    // 4. Verificar firma de imagen
    const hexSignature = imageBuffer.toString("hex", 0, 4);
    let extension = "bin";

    if (hexSignature.startsWith("89504e47")) {
      extension = "png";
    } else if (hexSignature.startsWith("ffd8")) {
      extension = "jpg";
    } else if (hexSignature.startsWith("47494638")) {
      extension = "gif";
    } else if (hexSignature.startsWith("52494646")) {
      extension = "webp";
    }

    // 5. Guardar archivo
    const filename = `img_${Date.now()}_${crypto
      .randomBytes(4)
      .toString("hex")}.${extension}`;
    const filePath = path.join(__dirname, "../public/images", filename);

    fs.writeFileSync(filePath, imageBuffer);
    return `/images/${filename}`;
  } catch (error) {
    console.error("Error al guardar imagen:", error);
    throw new Error("No se pudo procesar la imagen: " + error.message);
  }
}

exports.generateImage = async (req, res) => {
  try {
    const { prompt, model, size, quality } = req.body;
    const config = aiConfig.getConfig();

    if (!prompt?.trim()) {
      return res.status(400).json({
        success: false,
        error: "El prompt no puede estar vacío",
      });
    }

    const response = await axios.post(
      config.baseURL+"/images/generations",
      { prompt, model, size, quality },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (!response.data?.data?.[0]?.b64_json) {
      throw new Error("Formato de respuesta no reconocido");
    }

    const imageUrl = await saveBase64Image(
      response.data.data[0].b64_json,
      req.user.uid
    );

    // Guardar en BD y devolver si se guardó
    const savedImage = await Image.create({
      prompt,
      imageUrl,
      model,
      size,
      quality,
      userId: req.user.uid,
    });

    return res.json({
      success: true,
      imageUrl,
      prompt,
      autoSaved: !!savedImage,
    });
  } catch (error) {
    console.error("Error en generateImage:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      details:
        process.env.NODE_ENV === "development"
          ? {
              stack: error.stack,
              apiResponse: error.response?.data,
            }
          : null,
    });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    // Buscar la imagen en la base de datos
    const image = await Image.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        error: "Imagen no encontrada o no tienes permisos",
      });
    }

    // Eliminar el archivo físico
    const filePath = path.join(__dirname, "../public", image.imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar el registro de la base de datos
    await image.destroy();

    return res.json({
      success: true,
      message: "Imagen eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar imagen:", error);
    return res.status(500).json({
      success: false,
      error: "Error al eliminar la imagen",
      details: error.message,
    });
  }
};

exports.shareImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    console.log(
      `Intentando compartir imagen ID: ${id} para usuario: ${userId}`
    ); // Debug 1

    // Buscar la imagen en la base de datos
    const image = await Image.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!image) {
      console.error("Imagen no encontrada o no pertenece al usuario"); // Debug 2
      return res.status(404).json({
        success: false,
        error: "Imagen no encontrada o no tienes permisos",
      });
    }

    // Crear token único para compartir (válido por 7 días)
    const shareToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    console.log(`Generando token: ${shareToken} que expira: ${expiresAt}`); // Debug 3

    // Actualizar la imagen con datos de compartir
    const updated = await image.update({
      shareToken,
      shareExpiresAt: expiresAt,
    });

    if (!updated) {
      throw new Error("No se pudo actualizar la imagen con el token");
    }

    console.log("Imagen actualizada correctamente con token"); // Debug 4

    // Generar URL pública
    const shareUrl = `${req.protocol}://${req.get(
      "host"
    )}/generator/shared/${shareToken}`;

    console.log(`URL compartida generada: ${shareUrl}`); // Debug 5

    return res.json({
      success: true,
      shareUrl,
      expiresAt,
    });
  } catch (error) {
    console.error("Error detallado al compartir imagen:", {
      message: error.message,
      stack: error.stack,
      requestParams: req.params,
      requestUser: req.user,
    });
    return res.status(500).json({
      success: false,
      error: "Error al generar enlace compartible",
      details: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

exports.viewSharedImage = async (req, res) => {
  try {
    const { token } = req.params;

    console.log(`Buscando imagen con token: ${token}`); // Debug 1

    // Buscar imagen por token
    const image = await Image.findOne({
      where: {
        shareToken: token,
        shareExpiresAt: {
          [Op.gt]: new Date(), // Fecha de expiración mayor a ahora
        },
      },
    });

    if (!image) {
      console.error("No se encontró imagen con token válido"); // Debug 2
      return res.status(404).render("shared-error", {
        title: "Enlace no válido",
        message: "Este enlace ha expirado o no existe",
        layout: false,
      });
    }

    console.log(`Imagen encontrada: ${image.id}`); // Debug 3

    // Verificar que la imagen existe físicamente
    const imagePath = path.join(__dirname, "../public", image.imageUrl);
    if (!fs.existsSync(imagePath)) {
      console.error(`El archivo de imagen no existe: ${imagePath}`); // Debug 4
      throw new Error("La imagen no se encuentra en el servidor");
    }

    // Renderizar vista especial para imágenes compartidas
    return res.render("shared-image", {
      title: "Imagen Compartida",
      imageUrl: image.imageUrl,
      prompt: image.prompt,
      createdAt: image.createdAt,
      
    });
  } catch (error) {
    console.error("Error detallado al ver imagen compartida:", {
      message: error.message,
      stack: error.stack,
      token: req.params.token,
    });
    return res.status(500).render("shared-error", {
      title: "Error del servidor",
      message: "Ocurrió un error al cargar la imagen",
      layout: false,
    });
  }
};

exports.getUserImages = async (req, res) => {
  try {
    const images = await Image.findAll({
      where: { userId: req.user.uid },
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, images });
  } catch (error) {
    console.error("Error fetching images:", error);
    res
      .status(500)
      .json({ success: false, error: "Error al obtener las imágenes" });
  }
};
