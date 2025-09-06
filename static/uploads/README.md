# Uploads Directory

This directory contains static files that are served by the Flask application.

## Required Files

### Resume and Portfolio
- `resume.pdf` - Seth's resume in PDF format
- `portfolio.pdf` - Seth's portfolio in PDF format (separate from resume)

### Images
- `favicon.ico` - Website favicon
- `apple-touch-icon.png` - Apple touch icon (180x180px)
- `og-image.jpg` - Open Graph image for social media sharing

### Project Images
- `example-project-thumb.jpg` - Thumbnail for example project
- `example-project-hero.jpg` - Hero image for example project

## File Naming Convention

- Use lowercase letters and hyphens for filenames
- Keep filenames descriptive but concise
- Use appropriate file extensions (.jpg, .png, .pdf, etc.)

## Image Optimization

- Optimize images for web (compress, resize appropriately)
- Use WebP format when possible for better performance
- Ensure images are responsive and work well on mobile devices

## Security Notes

- Only upload files that are safe for public access
- Avoid uploading sensitive or personal information
- The Flask app serves these files directly without authentication
