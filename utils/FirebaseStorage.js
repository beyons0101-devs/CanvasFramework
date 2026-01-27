/**
 * FirebaseStorage - Utilitaire pour Firebase Cloud Storage
 * 
 * @example
 * const storage = new FirebaseStorage(firebaseCore);
 * await storage.uploadFile('images/photo.jpg', file);
 * const url = await storage.getDownloadURL('images/photo.jpg');
 * await storage.deleteFile('images/photo.jpg');
 */
class FirebaseStorage {
  constructor(firebaseCore) {
    this.core = firebaseCore;
    this.storage = null;
    this.uploadTasks = new Map();
  }

  /**
   * Initialiser Storage
   */
  initialize() {
    if (!this.storage) {
      this.storage = this.core.getStorage();
    }
    return this.storage;
  }

  /**
   * Obtenir une référence
   */
  ref(path = '') {
    if (!this.storage) this.initialize();
    return this.storage.ref(path);
  }

  // ==================== UPLOAD ====================

  /**
   * Upload un fichier
   */
  async uploadFile(path, file, metadata = {}, onProgress = null) {
    try {
      const storageRef = this.ref(path);
      
      // Créer la tâche d'upload
      const uploadTask = storageRef.put(file, {
        contentType: file.type,
        ...metadata
      });

      // Stocker la tâche
      this.uploadTasks.set(path, uploadTask);

      // Écouter la progression
      if (onProgress) {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              state: snapshot.state
            });
          }
        );
      }

      // Attendre la fin de l'upload
      const snapshot = await uploadTask;
      
      // Récupérer l'URL de téléchargement
      const downloadURL = await snapshot.ref.getDownloadURL();

      // Nettoyer
      this.uploadTasks.delete(path);

      return {
        success: true,
        url: downloadURL,
        fullPath: snapshot.ref.fullPath,
        name: snapshot.ref.name,
        size: snapshot.metadata.size,
        contentType: snapshot.metadata.contentType,
        timeCreated: snapshot.metadata.timeCreated,
        metadata: snapshot.metadata
      };
    } catch (error) {
      console.error(`❌ Erreur uploadFile ${path}:`, error);
      this.uploadTasks.delete(path);
      throw error;
    }
  }

  /**
   * Upload depuis un Blob
   */
  async uploadBlob(path, blob, metadata = {}, onProgress = null) {
    return this.uploadFile(path, blob, metadata, onProgress);
  }

  /**
   * Upload depuis une Data URL (base64)
   */
  async uploadDataURL(path, dataURL, metadata = {}, onProgress = null) {
    try {
      const storageRef = this.ref(path);
      
      const uploadTask = storageRef.putString(dataURL, 'data_url', metadata);
      this.uploadTasks.set(path, uploadTask);

      if (onProgress) {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              state: snapshot.state
            });
          }
        );
      }

      const snapshot = await uploadTask;
      const downloadURL = await snapshot.ref.getDownloadURL();

      this.uploadTasks.delete(path);

      return {
        success: true,
        url: downloadURL,
        fullPath: snapshot.ref.fullPath,
        name: snapshot.ref.name,
        metadata: snapshot.metadata
      };
    } catch (error) {
      console.error(`❌ Erreur uploadDataURL ${path}:`, error);
      this.uploadTasks.delete(path);
      throw error;
    }
  }

  /**
   * Upload avec compression d'image
   */
  async uploadImageCompressed(path, file, options = {}, onProgress = null) {
    try {
      const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        outputFormat = 'image/jpeg'
      } = options;

      // Créer un canvas pour la compression
      const compressed = await this.compressImage(file, maxWidth, maxHeight, quality, outputFormat);
      
      // Upload l'image compressée
      return await this.uploadBlob(path, compressed, {
        contentType: outputFormat
      }, onProgress);
    } catch (error) {
      console.error(`❌ Erreur uploadImageCompressed ${path}:`, error);
      throw error;
    }
  }

  /**
   * Upload multiple fichiers
   */
  async uploadMultiple(files, basePath = '', onProgress = null) {
    try {
      const uploads = files.map((file, index) => {
        const path = `${basePath}/${file.name}`;
        
        return this.uploadFile(path, file, {}, (progress) => {
          if (onProgress) {
            onProgress({
              fileIndex: index,
              fileName: file.name,
              ...progress
            });
          }
        });
      });

      const results = await Promise.all(uploads);
      
      return {
        success: true,
        files: results
      };
    } catch (error) {
      console.error('❌ Erreur uploadMultiple:', error);
      throw error;
    }
  }

  // ==================== DOWNLOAD ====================

  /**
   * Obtenir l'URL de téléchargement
   */
  async getDownloadURL(path) {
    try {
      const url = await this.ref(path).getDownloadURL();
      return url;
    } catch (error) {
      console.error(`❌ Erreur getDownloadURL ${path}:`, error);
      throw error;
    }
  }

  /**
   * Télécharger un fichier comme Blob
   */
  async downloadAsBlob(path, maxSize = 10485760) {
    try {
      const blob = await this.ref(path).getBytes(maxSize);
      return new Blob([blob]);
    } catch (error) {
      console.error(`❌ Erreur downloadAsBlob ${path}:`, error);
      throw error;
    }
  }

  /**
   * Télécharger un fichier comme Data URL
   */
  async downloadAsDataURL(path) {
    try {
      const url = await this.ref(path).getDownloadURL();
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`❌ Erreur downloadAsDataURL ${path}:`, error);
      throw error;
    }
  }

  // ==================== DELETE ====================

  /**
   * Supprimer un fichier
   */
  async deleteFile(path) {
    try {
      await this.ref(path).delete();
      return { success: true };
    } catch (error) {
      console.error(`❌ Erreur deleteFile ${path}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer plusieurs fichiers
   */
  async deleteMultiple(paths) {
    try {
      const deletions = paths.map(path => this.deleteFile(path));
      await Promise.all(deletions);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur deleteMultiple:', error);
      throw error;
    }
  }

  // ==================== METADATA ====================

  /**
   * Obtenir les métadonnées
   */
  async getMetadata(path) {
    try {
      const metadata = await this.ref(path).getMetadata();
      return metadata;
    } catch (error) {
      console.error(`❌ Erreur getMetadata ${path}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour les métadonnées
   */
  async updateMetadata(path, metadata) {
    try {
      const newMetadata = await this.ref(path).updateMetadata(metadata);
      return newMetadata;
    } catch (error) {
      console.error(`❌ Erreur updateMetadata ${path}:`, error);
      throw error;
    }
  }

  // ==================== LIST ====================

  /**
   * Lister les fichiers d'un dossier
   */
  async listFiles(path, options = {}) {
    try {
      const { maxResults = 100, pageToken = null } = options;
      
      const result = await this.ref(path).list({
        maxResults,
        pageToken
      });

      const items = result.items.map(item => ({
        name: item.name,
        fullPath: item.fullPath,
        bucket: item.bucket
      }));

      const prefixes = result.prefixes.map(prefix => ({
        name: prefix.name,
        fullPath: prefix.fullPath
      }));

      return {
        items,
        prefixes,
        nextPageToken: result.nextPageToken || null
      };
    } catch (error) {
      console.error(`❌ Erreur listFiles ${path}:`, error);
      throw error;
    }
  }

  /**
   * Lister tous les fichiers (récursif)
   */
  async listAllFiles(path) {
    try {
      const result = await this.ref(path).listAll();

      const items = result.items.map(item => ({
        name: item.name,
        fullPath: item.fullPath,
        bucket: item.bucket
      }));

      const prefixes = result.prefixes.map(prefix => ({
        name: prefix.name,
        fullPath: prefix.fullPath
      }));

      return {
        items,
        prefixes
      };
    } catch (error) {
      console.error(`❌ Erreur listAllFiles ${path}:`, error);
      throw error;
    }
  }

  // ==================== UPLOAD CONTROL ====================

  /**
   * Mettre en pause un upload
   */
  pauseUpload(path) {
    const uploadTask = this.uploadTasks.get(path);
    if (uploadTask) {
      uploadTask.pause();
      return true;
    }
    return false;
  }

  /**
   * Reprendre un upload
   */
  resumeUpload(path) {
    const uploadTask = this.uploadTasks.get(path);
    if (uploadTask) {
      uploadTask.resume();
      return true;
    }
    return false;
  }

  /**
   * Annuler un upload
   */
  cancelUpload(path) {
    const uploadTask = this.uploadTasks.get(path);
    if (uploadTask) {
      uploadTask.cancel();
      this.uploadTasks.delete(path);
      return true;
    }
    return false;
  }

  /**
   * Obtenir l'état d'un upload
   */
  getUploadState(path) {
    const uploadTask = this.uploadTasks.get(path);
    if (uploadTask) {
      return uploadTask.snapshot.state;
    }
    return null;
  }

  // ==================== HELPERS ====================

  /**
   * Compresser une image
   */
  compressImage(file, maxWidth, maxHeight, quality, outputFormat) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculer les nouvelles dimensions
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir en Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Erreur compression image'));
              }
            },
            outputFormat,
            quality
          );
        };

        img.onerror = () => reject(new Error('Erreur chargement image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Erreur lecture fichier'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Obtenir l'extension d'un fichier
   */
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  /**
   * Générer un nom de fichier unique
   */
  generateUniqueFilename(originalFilename) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(originalFilename);
    const basename = originalFilename.replace(`.${extension}`, '');
    
    return `${basename}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Valider le type de fichier
   */
  validateFileType(file, allowedTypes = []) {
    if (allowedTypes.length === 0) return true;
    
    const fileType = file.type;
    const fileExtension = this.getFileExtension(file.name);
    
    return allowedTypes.some(type => {
      if (type.includes('*')) {
        // Wildcard: "image/*"
        const category = type.split('/')[0];
        return fileType.startsWith(category);
      } else if (type.startsWith('.')) {
        // Extension: ".jpg"
        return fileExtension === type.substring(1);
      } else {
        // MIME type: "image/jpeg"
        return fileType === type;
      }
    });
  }

  /**
   * Valider la taille du fichier
   */
  validateFileSize(file, maxSizeInMB) {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  }

  /**
   * Formater la taille d'un fichier
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Vérifier si un fichier existe
   */
  async fileExists(path) {
    try {
      await this.ref(path).getMetadata();
      return true;
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Copier un fichier
   */
  async copyFile(sourcePath, destPath) {
    try {
      // Télécharger le fichier source
      const blob = await this.downloadAsBlob(sourcePath);
      
      // Re-uploader vers la destination
      const result = await this.uploadBlob(destPath, blob);
      
      return result;
    } catch (error) {
      console.error('❌ Erreur copyFile:', error);
      throw error;
    }
  }

  /**
   * Déplacer un fichier
   */
  async moveFile(sourcePath, destPath) {
    try {
      // Copier le fichier
      await this.copyFile(sourcePath, destPath);
      
      // Supprimer la source
      await this.deleteFile(sourcePath);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur moveFile:', error);
      throw error;
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Nettoyer les ressources
   */
  destroy() {
    // Annuler tous les uploads en cours
    this.uploadTasks.forEach((task, path) => {
      task.cancel();
    });
    
    this.uploadTasks.clear();
    this.storage = null;
    
  }
}

export default FirebaseStorage;
