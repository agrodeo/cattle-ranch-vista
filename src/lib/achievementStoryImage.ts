import html2canvas from 'html2canvas';

/**
 * Renders the off-screen story element to a high-quality PNG blob.
 */
export async function generateAchievementStoryImage(
  element: HTMLElement
): Promise<Blob | null> {
  try {
    // Wait for fonts (Montserrat) to be fully loaded before capture
    await document.fonts.ready;

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: 1080,
      height: 1920,
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  } catch (error) {
    console.error('Error generating story image:', error);
    return null;
  }
}
