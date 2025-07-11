// Function to get original image URL without parameters
function getOriginalImageSrc(src) {
    if (!src) return '';
    // Skip base64 placeholder images
    if (src.startsWith('data:')) return '';
    return src.split('?')[0];
}

// Function to get all images from slideshow in Suite Overview tab
function getSlideshowImages() {
    const images = [];
    const slides = document.querySelectorAll('[data-content-name="tab_content_overview"] .image-gallery-slide img[src]');
    
    slides.forEach(slide => {
        const imgSrc = slide.getAttribute('src');
        if (imgSrc && !imgSrc.startsWith('data:')) {
            images.push(getOriginalImageSrc(imgSrc));
        }
    });
    
    return images;
}

// Function to close the modal
function closeModal() {
    const closeButton = document.querySelector('button[data-content-piece="close-modal"]');
    if (closeButton) {
        closeButton.click();
    }
}

// Function to wait for element to be present
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element);
            } else if (Date.now() - startTime >= timeout) {
                clearInterval(interval);
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }
        }, 100);
    });
}

// Main scraping function
async function scrapeAllSuitesWithImages() {
    const suitesSection = document.querySelector('div[data-content-name="suites"]');
    if (!suitesSection) {
        console.error('Suites section not found');
        return;
    }

    const suiteArticles = suitesSection.querySelectorAll('article[class*="BaseCard-module_base-card"]');
    const allData = [];
    
    for (const article of suiteArticles) {
        // Extract basic info
        const nameElement = article.querySelector('.BaseCard-module_title__j4oYV button');
        const name = nameElement ? nameElement.textContent.trim() : '';
        
        const descElement = article.querySelector('.BaseCard-module_body__NU-4c p');
        const description = descElement ? descElement.textContent.trim() : '';
        
        const imageElement = article.querySelector('.BaseCard-module_image__C7fPH img');
        const mainImage = imageElement ? getOriginalImageSrc(imageElement.getAttribute('src')) : '';
        
        // Skip if we already have this suite
        if (allData.some(item => item.name === name)) continue;
        
        // Click to open modal
        if (nameElement) {
            nameElement.click();
            
            try {
                // Wait for modal to open and Suite Overview tab to load
                await waitForElement('[data-content-name="tab_content_overview"] .image-gallery-slide img:not([src^="data:"])');
                
                // Get additional images from Suite Overview tab
                const additionalImages = getSlideshowImages();
                
                // Prepare data object
                const suiteData = {
                    name,
                    description,
                    mainImage,
                    additionalImages
                };
                
                allData.push(suiteData);
                console.log(`Processed: ${name} (${additionalImages.length} additional images)`);
            } catch (error) {
                console.error(`Error processing ${name}:`, error.message);
            } finally {
                // Close modal
                closeModal();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    // Convert to TSV
    let tsvOutput = "Name\tDescription\tMain Image";
    
    // Add columns for additional images (up to 10)
    for (let i = 1; i <= 10; i++) {
        tsvOutput += `\tImage ${i}`;
    }
    tsvOutput += "\n";
    
    allData.forEach(suite => {
        tsvOutput += `${suite.name}\t${suite.description}\t${suite.mainImage}`;
        
        // Add up to 10 additional images
        for (let i = 0; i < 10; i++) {
            tsvOutput += `\t${suite.additionalImages[i] || ''}`;
        }
        
        tsvOutput += "\n";
    });
    
    console.log(tsvOutput);
    console.log(`Scraped ${allData.length} suites with additional images`);
    return allData;
}

// Start scraping
scrapeAllSuitesWithImages();
