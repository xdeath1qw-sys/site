// ══════════════════════════════════════════════════════════════
//  EFL League — ImgBB Image Upload
// ══════════════════════════════════════════════════════════════

const IMGBB_API_KEY = '9d3a2bb23eee4c0d003a77f503ea8ff0';

/**
 * Загрузить изображение на ImgBB
 * @param {string} base64orFile - base64 строка (data:image/...) или File объект
 * @returns {Promise<string>} - URL загруженного изображения
 */
async function uploadToImgBB(base64orFile) {
  let base64data;

  if (typeof base64orFile === 'string') {
    // Убираем префикс data:image/...;base64,
    base64data = base64orFile.includes(',')
      ? base64orFile.split(',')[1]
      : base64orFile;
  } else if (base64orFile instanceof File) {
    // Конвертируем File в base64
    base64data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target.result;
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(base64orFile);
    });
  } else {
    throw new Error('Неверный формат изображения');
  }

  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64data);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ImgBB ошибка: ${err}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(`ImgBB: ${json.error?.message || 'Неизвестная ошибка'}`);
  }

  return json.data.url;
}

/**
 * Обёртка для file input — загружает файл и возвращает URL
 * @param {File} file
 * @returns {Promise<string>} URL
 */
async function uploadFileToImgBB(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Выберите изображение');
  }
  return await uploadToImgBB(file);
}

window.uploadToImgBB = uploadToImgBB;
window.uploadFileToImgBB = uploadFileToImgBB;
