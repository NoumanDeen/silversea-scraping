// Function to get clean image URL
function getCleanImageUrl(src) {
    return src && !src.startsWith('data:') ? src.split('?')[0] : '';
}

// Function to get carousel images
function getCarouselImages() {
    return Array.from(document.querySelectorAll('[data-content-name="tab_content_overview"] .image-gallery-slide img[src]'))
        .map(img => getCleanImageUrl(img.getAttribute('src')))
        .filter(url => url);
}

// Function to get suite plan image
function getSuitePlanImage() {
    const planImg = document.querySelector('[data-content-name="tab_content_plan"] img[src]');
    return planImg ? getCleanImageUrl(planImg.getAttribute('src')) : '';
}

// Tab navigation helper
async function switchTab(tabSelector, contentSelector) {
    const tab = document.querySelector(tabSelector);
    if (tab) {
        tab.click();
        await new Promise(resolve => setTimeout(resolve, 1500));
        await waitForElement(contentSelector, 3000).catch(() => null);
    }
}

// Element waiting utility
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            if (Date.now() - start > timeout) return reject(new Error(`Timeout waiting for ${selector}`));
            setTimeout(check, 100);
        };
        check();
    });
}

// Main scraping function
async function scrapeAllSuites() {
    const allSuites = [];
    const suiteCards = document.querySelectorAll('div[data-content-name="suites"] article[class*="BaseCard-module_base-card"]');

    for (const card of suiteCards) {
        const name = card.querySelector('.BaseCard-module_title__j4oYV button')?.textContent.trim() || '';
        const description = card.querySelector('.BaseCard-module_body__NU-4c p')?.textContent.trim() || '';
        const mainImg = getCleanImageUrl(card.querySelector('.BaseCard-module_image__C7fPH img')?.getAttribute('src'));

        if (!name || allSuites.some(s => s.name === name)) continue;

        card.querySelector('.BaseCard-module_title__j4oYV button').click();
        
        try {
            // Get Overview images
            await waitForElement('[data-content-name="tab_content_overview"] .image-gallery-slide img:not([src^="data:"])');
            const carouselImgs = getCarouselImages();
            
            // Get Plan image
            await switchTab('[data-content-piece="suite-plan"]', '[data-content-name="tab_content_plan"] img');
            const planImg = getSuitePlanImage();
            
            // Return to Overview
            await switchTab('[data-content-piece="suite-overview"]', '[data-content-name="tab_content_overview"]');

            allSuites.push({
                name,
                description,
                planImg,
                mainImg,
                carouselImgs
            });
            
            console.log(`✓ ${name}`);
        } catch (error) {
            console.error(`✗ ${name}:`, error.message);
        } finally {
            document.querySelector('button[data-content-piece="close-modal"]')?.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Generate TSV with exact column order
    let tsv = 'Name\tDescription\tSuite Plan\tMain Image';
    const maxImages = Math.max(...allSuites.map(s => s.carouselImgs.length), 10);
    
    // Add image columns
    for (let i = 1; i <= maxImages; i++) {
        tsv += `\tImage ${i}`;
    }
    tsv += '\n';
    
    // Add suite data
    allSuites.forEach(suite => {
        tsv += `${suite.name}\t${suite.description}\t${suite.planImg}\t${suite.mainImg}`;
        suite.carouselImgs.forEach(img => tsv += `\t${img}`);
        tsv += '\n';
    });

    console.log(tsv);
    console.log(`✅ Scraped ${allSuites.length} suites with ${maxImages} max carousel images`);
    return allSuites;
}

// Execute
scrapeAllSuites();
