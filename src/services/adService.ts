import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// معرفات الاختبار من Google (للتطوير)
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

// معرفاتك الحقيقية من AdMob
const BANNER_AD_ID = 'ca-app-pub-7441690948136756/8828876770';
const INTERSTITIAL_AD_ID = 'ca-app-pub-7441690948136756/xxxxxxxxxx';
const REWARDED_AD_ID = 'ca-app-pub-7441690948136756/xxxxxxxxxx';

// تفعيل وضع الاختبار أثناء التطوير (غيّرها إلى false عند النشر)
const IS_TESTING = false;

export class AdService {
  
  static async initialize() {
    if (!Capacitor.isNativePlatform()) return;
    
    await (AdMob as any).initialize({
      requestTrackingAuthorization: true,
      initializeForTesting: IS_TESTING,
    });
  }

  static async showBanner() {
    if (!Capacitor.isNativePlatform()) return;
    
    const options: BannerAdOptions = {
      adId: IS_TESTING ? TEST_BANNER_ID : BANNER_AD_ID,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: IS_TESTING,
      margin: 0,
    };
    
    try {
      await AdMob.showBanner(options);
    } catch (error) {
      console.error('خطأ في عرض البانر:', error);
    }
  }

  static async hideBanner() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await AdMob.hideBanner();
    } catch (error) {
      console.error('خطأ في إخفاء البانر:', error);
    }
  }

  static async showInterstitial() {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await AdMob.prepareInterstitial({
        adId: IS_TESTING ? TEST_INTERSTITIAL_ID : INTERSTITIAL_AD_ID,
        isTesting: IS_TESTING,
      });
      await AdMob.showInterstitial();
    } catch (error) {
      console.error('خطأ في عرض الإعلان البيني:', error);
    }
  }

  static async showRewardedAd(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    
    return new Promise(async (resolve) => {
      try {
        await AdMob.prepareRewardVideoAd({
          adId: IS_TESTING ? TEST_REWARDED_ID : REWARDED_AD_ID,
          isTesting: IS_TESTING,
        });
        
        const rewardListener = await (AdMob as any).addListener('onRewarded', () => {
          resolve(true);
        });
        
        const closeListener = await (AdMob as any).addListener('onRewardedVideoAdClosed', () => {
          rewardListener.remove();
          closeListener.remove();
          resolve(false);
        });
        
        await AdMob.showRewardVideoAd();
      } catch (error) {
        console.error('خطأ في عرض إعلان المكافأة:', error);
        resolve(false);
      }
    });
  }
}
