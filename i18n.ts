import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

const resources = {
    en: {
        translation: {
            // General
            welcome: "Welcome to Edugram",
            login: "Login",
            dashboard: "Dashboard",

            // Navbar
            navbar_brand: "EDUGRAM",
            nav_dashboard: "Dashboard",
            nav_courses: "Courses",
            nav_resources: "Resources",
            nav_logout: "Log Out",

            // Landing - Hero
            hero_badge: "✨ Powered by Advanced AI",
            hero_title_1: "Transform Learning with",
            hero_title_2: "EDUGRAM",
            hero_description: "Experience the future of education with our revolutionary AI-powered platform. Join over 500,000 learners who've accelerated their journey to success with personalized, adaptive learning experiences.",
            hero_cta_google: "Start Learning with Google",
            hero_cta_demo: "Watch Demo",

            // Landing - Stats
            stat_learners: "Active Learners",
            stat_success: "Success Rate",
            stat_countries: "Countries",
            stat_rating: "User Rating",

            // Landing - Testimonials
            testimonial_1_text: "EDUGRAM transformed my learning experience!",
            testimonial_1_author: "Sarah Chen",
            testimonial_1_role: "Computer Science Student",
            testimonial_2_text: "The AI-powered insights are incredible.",
            testimonial_2_author: "Michael Rodriguez",
            testimonial_2_role: "Data Science Professional",
            testimonial_3_text: "Finally, a platform that adapts to how I learn.",
            testimonial_3_author: "Emily Johnson",
            testimonial_3_role: "Engineering Student",

            // Landing - Features
            feature_ai_title: "AI-Powered Personalization",
            feature_ai_desc: "Advanced machine learning algorithms create personalized learning paths tailored to your unique cognitive patterns and learning preferences.",
            feature_accel_title: "Accelerated Learning",
            feature_accel_desc: "Boost your learning speed by 3x with our scientifically-backed spaced repetition and active recall techniques.",
            feature_analytics_title: "Smart Analytics",
            feature_analytics_desc: "Real-time performance insights and predictive analytics help you identify strengths and optimize weak areas.",
            feature_interactive_title: "Interactive Content",
            feature_interactive_desc: "Engage with dynamic, multimedia content including AR/VR experiences, interactive simulations, and gamified challenges.",
            feature_progress_title: "Progress Visualization",
            feature_progress_desc: "Beautiful, intuitive dashboards provide comprehensive views of your learning journey with actionable insights.",
            feature_collab_title: "Collaborative Learning",
            feature_collab_desc: "Connect with peers, join study groups, and participate in knowledge-sharing communities worldwide.",

            // Landing - Section Headers
            why_choose: "Why Choose EDUGRAM?",
            why_choose_desc: "Cutting-edge features designed to maximize your learning potential",
            experience_future: "Experience the Future of Learning",
            experience_future_desc: "See how our AI adapts to your learning style in real-time",
            demo_feature_1: "Real-time adaptation to your pace",
            demo_feature_2: "Personalized content recommendations",
            demo_feature_3: "Interactive progress tracking",
            ready_transform: "Ready to Transform Your Learning?",
            join_revolution: "Join the revolution in personalized education",
            get_started: "Get Started Now",

            // Landing - Progress bars
            machine_learning: "Machine Learning",
            data_structures: "Data Structures",
            algorithms: "Algorithms",

            // Features Page
            empower_learn: "Empower-Learn",
            innovative_features: "Innovative Features",
            features_page_desc: "Discover our state-of-the-art learning platform with features designed for everyone",
            scroll_explore: "Scroll to explore",
            explore: "Explore",

            // Feature Cards
            blind_assistance: "Blind Assistance",
            blind_assistance_msg: "This is blind assistance",
            blind_assistance_desc: "Advanced tools designed specifically for visually impaired users, providing audio descriptions and enhanced navigation support.",
            deaf_assistance: "Deaf Assistance",
            deaf_assistance_msg: "This is deaf assistance",
            deaf_assistance_desc: "Comprehensive solutions for hearing-impaired individuals with visual cues, transcription services, and sign language integration.",
            visual_study: "Visual Study",
            visual_study_msg: "LEARN THROUGH VISUALS",
            visual_study_desc: "Concept-based visual learning using animations, mind maps, infographics, and graphs, helping students understand faster without reading long text.",
            personalized_learning: "Personalized Learning",
            personalized_learning_msg: "THIS IS PERSONALIZED LEARNING",
            personalized_learning_desc: "AI-powered learning paths with customizable quizzes, interactive flashcards, and progress tracking for all users.",

            // Floating Taskbar
            learning_hub: "Learning Hub",
            assistive_tools: "Assistive Tools",
            entertainment: "Entertainment",

            // Search By Topic
            search_by_topic: "Search by Topic",
            enter_topic_prompt: "Please enter the topic name you want to learn:",
            enter_topic_placeholder: "Enter topic name",
            loading: "Loading...",
            generating_video: "Generating video, please wait...",
            video_placeholder: "Video will appear here after generation",
            enter_topic_alert: "Please enter a topic name",
            video_error: "An error occurred while getting the video",
            browser_no_video: "Your browser does not support the video tag.",

            // Assistive Tools
            welcome_assistive: "Welcome to Assistive Tools",
            learning_panel: "Learning Panel",
            audio_video_transcriber: "Audio/Video Transcriber",
            voice_to_gesture: "Voice-to-Gesture",
            sign_language_dictionary: "Sign Language Dictionary",
            upload_transcription: "Upload an audio or video file to get transcription",
            choose_file: "Choose File",
            selected_file: "Selected File:",
            upload: "Upload",
            no_file_selected: "Error: No file selected",
            uploading: "Uploading...",
            upload_success: "Successfully uploaded",
            upload_error: "Error in uploading",
            no_file_mcqs: "Error: No file selected for MCQs generation",
            error_mcqs: "Error generating MCQs",
            no_file_summary: "Error: No file selected for summarization",
            error_summary: "Error generating summary",
            no_file_flashcards: "Error: No file selected for flashcards generation",
            error_flashcards: "Error generating flashcards",
            unknown_view: "Unknown view"
        }
    },
    hi: {
        translation: {
            // General
            welcome: "एडुग्राम में आपका स्वागत है",
            login: "लॉगिन",
            dashboard: "डैशबोर्ड",

            // Navbar
            navbar_brand: "एडुग्राम",
            nav_dashboard: "डैशबोर्ड",
            nav_courses: "पाठ्यक्रम",
            nav_resources: "संसाधन",
            nav_logout: "लॉग आउट",

            // Landing - Hero
            hero_badge: "✨ उन्नत AI द्वारा संचालित",
            hero_title_1: "सीखने को बदलें",
            hero_title_2: "एडुग्राम",
            hero_description: "हमारे क्रांतिकारी AI-संचालित प्लेटफ़ॉर्म के साथ शिक्षा के भविष्य का अनुभव करें। 5,00,000 से अधिक शिक्षार्थियों से जुड़ें जिन्होंने व्यक्तिगत, अनुकूली शिक्षण अनुभवों के साथ सफलता की ओर अपनी यात्रा को तेज़ किया है।",
            hero_cta_google: "Google से सीखना शुरू करें",
            hero_cta_demo: "डेमो देखें",

            // Landing - Stats
            stat_learners: "सक्रिय शिक्षार्थी",
            stat_success: "सफलता दर",
            stat_countries: "देश",
            stat_rating: "उपयोगकर्ता रेटिंग",

            // Landing - Testimonials
            testimonial_1_text: "एडुग्राम ने मेरे सीखने के अनुभव को बदल दिया!",
            testimonial_1_author: "सारा चेन",
            testimonial_1_role: "कंप्यूटर साइंस छात्र",
            testimonial_2_text: "AI-संचालित अंतर्दृष्टि अविश्वसनीय हैं।",
            testimonial_2_author: "माइकल रोड्रिगेज",
            testimonial_2_role: "डेटा साइंस पेशेवर",
            testimonial_3_text: "आखिरकार, एक ऐसा प्लेटफ़ॉर्म जो मेरे सीखने के तरीके के अनुसार ढलता है।",
            testimonial_3_author: "एमिली जॉनसन",
            testimonial_3_role: "इंजीनियरिंग छात्र",

            // Landing - Features
            feature_ai_title: "AI-संचालित वैयक्तिकरण",
            feature_ai_desc: "उन्नत मशीन लर्निंग एल्गोरिदम आपके अद्वितीय संज्ञानात्मक पैटर्न और सीखने की प्राथमिकताओं के अनुरूप व्यक्तिगत शिक्षण पथ बनाते हैं।",
            feature_accel_title: "त्वरित शिक्षण",
            feature_accel_desc: "हमारी वैज्ञानिक रूप से समर्थित स्पेस्ड रिपिटिशन और एक्टिव रिकॉल तकनीकों के साथ अपनी सीखने की गति 3 गुना बढ़ाएं।",
            feature_analytics_title: "स्मार्ट एनालिटिक्स",
            feature_analytics_desc: "रीयल-टाइम प्रदर्शन अंतर्दृष्टि और पूर्वानुमानी विश्लेषण आपकी ताकत पहचानने और कमजोर क्षेत्रों को अनुकूलित करने में मदद करते हैं।",
            feature_interactive_title: "इंटरैक्टिव सामग्री",
            feature_interactive_desc: "AR/VR अनुभवों, इंटरैक्टिव सिमुलेशन और गेमिफ़ाइड चुनौतियों सहित गतिशील, मल्टीमीडिया सामग्री के साथ जुड़ें।",
            feature_progress_title: "प्रगति विज़ुअलाइज़ेशन",
            feature_progress_desc: "सुंदर, सहज ज्ञान युक्त डैशबोर्ड कार्रवाई योग्य अंतर्दृष्टि के साथ आपकी शिक्षण यात्रा के व्यापक दृश्य प्रदान करते हैं।",
            feature_collab_title: "सहयोगात्मक शिक्षण",
            feature_collab_desc: "साथियों से जुड़ें, अध्ययन समूहों में शामिल हों, और दुनिया भर में ज्ञान-साझाकरण समुदायों में भाग लें।",

            // Landing - Section Headers
            why_choose: "एडुग्राम क्यों चुनें?",
            why_choose_desc: "आपकी सीखने की क्षमता को अधिकतम करने के लिए डिज़ाइन की गई अत्याधुनिक सुविधाएँ",
            experience_future: "शिक्षण के भविष्य का अनुभव करें",
            experience_future_desc: "देखें कि हमारा AI रीयल-टाइम में आपकी सीखने की शैली के अनुसार कैसे ढलता है",
            demo_feature_1: "आपकी गति के अनुसार रीयल-टाइम अनुकूलन",
            demo_feature_2: "व्यक्तिगत सामग्री अनुशंसाएँ",
            demo_feature_3: "इंटरैक्टिव प्रगति ट्रैकिंग",
            ready_transform: "अपनी शिक्षा को बदलने के लिए तैयार हैं?",
            join_revolution: "व्यक्तिगत शिक्षा में क्रांति में शामिल हों",
            get_started: "अभी शुरू करें",

            // Landing - Progress bars
            machine_learning: "मशीन लर्निंग",
            data_structures: "डेटा स्ट्रक्चर",
            algorithms: "एल्गोरिदम",

            // Features Page
            empower_learn: "सशक्त-शिक्षण",
            innovative_features: "नवीन सुविधाएँ",
            features_page_desc: "सभी के लिए डिज़ाइन की गई सुविधाओं के साथ हमारे अत्याधुनिक शिक्षण प्लेटफ़ॉर्म की खोज करें",
            scroll_explore: "अन्वेषण करने के लिए स्क्रॉल करें",
            explore: "अन्वेषण करें",

            // Feature Cards
            blind_assistance: "दृष्टिबाधित सहायता",
            blind_assistance_msg: "यह दृष्टिबाधित सहायता है",
            blind_assistance_desc: "दृष्टिबाधित उपयोगकर्ताओं के लिए विशेष रूप से डिज़ाइन किए गए उन्नत उपकरण, ऑडियो विवरण और बेहतर नेविगेशन सहायता प्रदान करते हैं।",
            deaf_assistance: "श्रवण बाधित सहायता",
            deaf_assistance_msg: "यह श्रवण बाधित सहायता है",
            deaf_assistance_desc: "दृश्य संकेतों, ट्रांसक्रिप्शन सेवाओं और सांकेतिक भाषा एकीकरण के साथ श्रवण बाधित व्यक्तियों के लिए व्यापक समाधान।",
            visual_study: "दृश्य अध्ययन",
            visual_study_msg: "दृश्यों के माध्यम से सीखें",
            visual_study_desc: "एनिमेशन, माइंड मैप, इन्फोग्राफिक्स और ग्राफ़ का उपयोग करके अवधारणा-आधारित दृश्य शिक्षण, छात्रों को लंबे टेक्स्ट पढ़े बिना तेज़ी से समझने में मदद करता है।",
            personalized_learning: "व्यक्तिगत शिक्षण",
            personalized_learning_msg: "यह व्यक्तिगत शिक्षण है",
            personalized_learning_desc: "अनुकूलन योग्य क्विज़, इंटरैक्टिव फ़्लैशकार्ड और सभी उपयोगकर्ताओं के लिए प्रगति ट्रैकिंग के साथ AI-संचालित शिक्षण पथ।",

            // Floating Taskbar
            learning_hub: "लर्निंग हब",
            assistive_tools: "सहायक उपकरण",
            entertainment: "मनोरंजन",

            // Search By Topic
            search_by_topic: "विषय से खोजें",
            enter_topic_prompt: "कृपया वह विषय नाम दर्ज करें जिसे आप सीखना चाहते हैं:",
            enter_topic_placeholder: "विषय का नाम दर्ज करें",
            loading: "लोड हो रहा है...",
            generating_video: "वीडियो बनाया जा रहा है, कृपया प्रतीक्षा करें...",
            video_placeholder: "वीडियो जनरेशन के बाद यहाँ दिखाई देगा",
            enter_topic_alert: "कृपया एक विषय नाम दर्ज करें",
            video_error: "वीडियो प्राप्त करने में एक त्रुटि हुई",
            browser_no_video: "आपका ब्राउज़र वीडियो टैग का समर्थन नहीं करता।",

            // Assistive Tools
            welcome_assistive: "सहायक उपकरणों में आपका स्वागत है",
            learning_panel: "लर्निंग पैनल",
            audio_video_transcriber: "ऑडियो/वीडियो ट्रांसक्राइबर",
            voice_to_gesture: "वॉइस-टू-जेस्चर",
            sign_language_dictionary: "सांकेतिक भाषा शब्दकोश",
            upload_transcription: "ट्रांसक्रिप्शन के लिए एक ऑडियो या वीडियो फ़ाइल अपलोड करें",
            choose_file: "फ़ाइल चुनें",
            selected_file: "चयनित फ़ाइल:",
            upload: "अपलोड करें",
            no_file_selected: "त्रुटि: कोई फ़ाइल नहीं चुनी गई",
            uploading: "अपलोड हो रहा है...",
            upload_success: "सफलतापूर्वक अपलोड किया गया",
            upload_error: "अपलोड में त्रुटि",
            no_file_mcqs: "त्रुटि: MCQ जनरेशन के लिए कोई फ़ाइल नहीं चुनी गई",
            error_mcqs: "MCQ बनाने में त्रुटि",
            no_file_summary: "त्रुटि: सारांश के लिए कोई फ़ाइल नहीं चुनी गई",
            error_summary: "सारांश बनाने में त्रुटि",
            no_file_flashcards: "त्रुटि: फ़्लैशकार्ड जनरेशन के लिए कोई फ़ाइल नहीं चुनी गई",
            error_flashcards: "फ़्लैशकार्ड बनाने में त्रुटि",
            unknown_view: "अज्ञात दृश्य"
        }
    },
    kn: {
        translation: {
            // General
            welcome: "ಎಡುಗ್ರಾಮ್ಗೆ ಸ್ವಾಗತ",
            login: "ಲಾಗಿನ್",
            dashboard: "ಡ್ಯಾಶ್ಬೋರ್ಡ್",

            // Navbar
            navbar_brand: "ಎಡುಗ್ರಾಮ್",
            nav_dashboard: "ಡ್ಯಾಶ್ಬೋರ್ಡ್",
            nav_courses: "ಕೋರ್ಸ್‌ಗಳು",
            nav_resources: "ಸಂಪನ್ಮೂಲಗಳು",
            nav_logout: "ಲಾಗ್ ಔಟ್",

            // Landing - Hero
            hero_badge: "✨ ಮುಂದುವರಿದ AI ನಿಂದ ನಡೆಸಲ್ಪಡುತ್ತದೆ",
            hero_title_1: "ಕಲಿಕೆಯನ್ನು ಬದಲಾಯಿಸಿ",
            hero_title_2: "ಎಡುಗ್ರಾಮ್",
            hero_description: "ನಮ್ಮ ಕ್ರಾಂತಿಕಾರಿ AI-ಚಾಲಿತ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌ನೊಂದಿಗೆ ಶಿಕ್ಷಣದ ಭವಿಷ್ಯವನ್ನು ಅನುಭವಿಸಿ. ವೈಯಕ್ತಿಕ, ಹೊಂದಿಕೊಳ್ಳುವ ಕಲಿಕೆಯ ಅನುಭವಗಳೊಂದಿಗೆ ಯಶಸ್ಸಿನತ್ತ ತಮ್ಮ ಪ್ರಯಾಣವನ್ನು ವೇಗಗೊಳಿಸಿದ 5,00,000 ಕ್ಕೂ ಹೆಚ್ಚು ಕಲಿಯುವವರನ್ನು ಸೇರಿ.",
            hero_cta_google: "Google ನೊಂದಿಗೆ ಕಲಿಯಲು ಪ್ರಾರಂಭಿಸಿ",
            hero_cta_demo: "ಡೆಮೊ ವೀಕ್ಷಿಸಿ",

            // Landing - Stats
            stat_learners: "ಸಕ್ರಿಯ ಕಲಿಯುವವರು",
            stat_success: "ಯಶಸ್ಸಿನ ದರ",
            stat_countries: "ದೇಶಗಳು",
            stat_rating: "ಬಳಕೆದಾರ ರೇಟಿಂಗ್",

            // Landing - Testimonials
            testimonial_1_text: "ಎಡುಗ್ರಾಮ್ ನನ್ನ ಕಲಿಕೆಯ ಅನುಭವವನ್ನು ಬದಲಾಯಿಸಿತು!",
            testimonial_1_author: "ಸಾರಾ ಚೆನ್",
            testimonial_1_role: "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ವಿದ್ಯಾರ್ಥಿ",
            testimonial_2_text: "AI-ಚಾಲಿತ ಒಳನೋಟಗಳು ಅತ್ಯದ್ಭುತ.",
            testimonial_2_author: "ಮೈಕೆಲ್ ರೋಡ್ರಿಗೆಜ್",
            testimonial_2_role: "ಡೇಟಾ ಸೈನ್ಸ್ ವೃತ್ತಿಪರ",
            testimonial_3_text: "ಕೊನೆಗೂ, ನನ್ನ ಕಲಿಕೆಯ ವಿಧಾನಕ್ಕೆ ಹೊಂದಿಕೊಳ್ಳುವ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್.",
            testimonial_3_author: "ಎಮಿಲಿ ಜಾನ್ಸನ್",
            testimonial_3_role: "ಎಂಜಿನಿಯರಿಂಗ್ ವಿದ್ಯಾರ್ಥಿ",

            // Landing - Features
            feature_ai_title: "AI-ಚಾಲಿತ ವೈಯಕ್ತೀಕರಣ",
            feature_ai_desc: "ಮುಂದುವರಿದ ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ ಅಲ್ಗಾರಿದಮ್‌ಗಳು ನಿಮ್ಮ ಅನನ್ಯ ಅರಿವಿನ ಮಾದರಿಗಳು ಮತ್ತು ಕಲಿಕೆಯ ಆದ್ಯತೆಗಳಿಗೆ ಅನುಗುಣವಾಗಿ ವೈಯಕ್ತಿಕ ಕಲಿಕೆಯ ಮಾರ್ಗಗಳನ್ನು ರಚಿಸುತ್ತವೆ.",
            feature_accel_title: "ತ್ವರಿತ ಕಲಿಕೆ",
            feature_accel_desc: "ನಮ್ಮ ವೈಜ್ಞಾನಿಕವಾಗಿ ಬೆಂಬಲಿತ ಸ್ಪೇಸ್ಡ್ ರೆಪಿಟಿಶನ್ ಮತ್ತು ಆಕ್ಟಿವ್ ರಿಕಾಲ್ ತಂತ್ರಗಳೊಂದಿಗೆ ನಿಮ್ಮ ಕಲಿಕೆಯ ವೇಗವನ್ನು 3 ಪಟ್ಟು ಹೆಚ್ಚಿಸಿ.",
            feature_analytics_title: "ಸ್ಮಾರ್ಟ್ ಅನಾಲಿಟಿಕ್ಸ್",
            feature_analytics_desc: "ರಿಯಲ್-ಟೈಮ್ ಕಾರ್ಯಕ್ಷಮತೆ ಒಳನೋಟಗಳು ಮತ್ತು ಮುನ್ಸೂಚಕ ವಿಶ್ಲೇಷಣೆಗಳು ನಿಮ್ಮ ಶಕ್ತಿಗಳನ್ನು ಗುರುತಿಸಲು ಮತ್ತು ದುರ್ಬಲ ಕ್ಷೇತ್ರಗಳನ್ನು ಅತ್ಯುತ್ತಮಗೊಳಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತವೆ.",
            feature_interactive_title: "ಸಂವಾದಾತ್ಮಕ ವಿಷಯ",
            feature_interactive_desc: "AR/VR ಅನುಭವಗಳು, ಸಂವಾದಾತ್ಮಕ ಸಿಮ್ಯುಲೇಶನ್‌ಗಳು ಮತ್ತು ಗೇಮಿಫೈಡ್ ಸವಾಲುಗಳನ್ನು ಒಳಗೊಂಡ ಡೈನಾಮಿಕ್, ಮಲ್ಟಿಮೀಡಿಯಾ ವಿಷಯದೊಂದಿಗೆ ತೊಡಗಿಸಿಕೊಳ್ಳಿ.",
            feature_progress_title: "ಪ್ರಗತಿ ವಿಶ್ಲೇಷಣೆ",
            feature_progress_desc: "ಸುಂದರ, ಅರ್ಥಗರ್ಭಿತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗಳು ಕ್ರಿಯಾಶೀಲ ಒಳನೋಟಗಳೊಂದಿಗೆ ನಿಮ್ಮ ಕಲಿಕೆಯ ಪ್ರಯಾಣದ ಸಮಗ್ರ ವೀಕ್ಷಣೆಗಳನ್ನು ಒದಗಿಸುತ್ತವೆ.",
            feature_collab_title: "ಸಹಯೋಗ ಕಲಿಕೆ",
            feature_collab_desc: "ಗೆಳೆಯರೊಂದಿಗೆ ಸಂಪರ್ಕ ಸಾಧಿಸಿ, ಅಧ್ಯಯನ ಗುಂಪುಗಳಲ್ಲಿ ಸೇರಿ, ಮತ್ತು ಜಗತ್ತಿನಾದ್ಯಂತ ಜ್ಞಾನ-ಹಂಚಿಕೆ ಸಮುದಾಯಗಳಲ್ಲಿ ಭಾಗವಹಿಸಿ.",

            // Landing - Section Headers
            why_choose: "ಎಡುಗ್ರಾಮ್ ಅನ್ನು ಏಕೆ ಆಯ್ಕೆ ಮಾಡಬೇಕು?",
            why_choose_desc: "ನಿಮ್ಮ ಕಲಿಕೆಯ ಸಾಮರ್ಥ್ಯವನ್ನು ಗರಿಷ್ಠಗೊಳಿಸಲು ವಿನ್ಯಾಸಗೊಳಿಸಲಾದ ಅತ್ಯಾಧುನಿಕ ವೈಶಿಷ್ಟ್ಯಗಳು",
            experience_future: "ಕಲಿಕೆಯ ಭವಿಷ್ಯವನ್ನು ಅನುಭವಿಸಿ",
            experience_future_desc: "ನಮ್ಮ AI ರಿಯಲ್-ಟೈಮ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಕಲಿಕೆಯ ಶೈಲಿಗೆ ಹೇಗೆ ಹೊಂದಿಕೊಳ್ಳುತ್ತದೆ ಎಂಬುದನ್ನು ನೋಡಿ",
            demo_feature_1: "ನಿಮ್ಮ ವೇಗಕ್ಕೆ ರಿಯಲ್-ಟೈಮ್ ಹೊಂದಾಣಿಕೆ",
            demo_feature_2: "ವೈಯಕ್ತಿಕ ವಿಷಯ ಶಿಫಾರಸುಗಳು",
            demo_feature_3: "ಸಂವಾದಾತ್ಮಕ ಪ್ರಗತಿ ಟ್ರ್ಯಾಕಿಂಗ್",
            ready_transform: "ನಿಮ್ಮ ಕಲಿಕೆಯನ್ನು ಬದಲಾಯಿಸಲು ಸಿದ್ಧರೇ?",
            join_revolution: "ವೈಯಕ್ತಿಕ ಶಿಕ್ಷಣದಲ್ಲಿ ಕ್ರಾಂತಿಯಲ್ಲಿ ಸೇರಿ",
            get_started: "ಈಗ ಪ್ರಾರಂಭಿಸಿ",

            // Landing - Progress bars
            machine_learning: "ಮೆಷಿನ್ ಲರ್ನಿಂಗ್",
            data_structures: "ಡೇಟಾ ಸ್ಟ್ರಕ್ಚರ್ಸ್",
            algorithms: "ಅಲ್ಗಾರಿದಮ್‌ಗಳು",

            // Features Page
            empower_learn: "ಸಬಲೀಕರಣ-ಕಲಿಕೆ",
            innovative_features: "ನವೀನ ವೈಶಿಷ್ಟ್ಯಗಳು",
            features_page_desc: "ಎಲ್ಲರಿಗೂ ವಿನ್ಯಾಸಗೊಳಿಸಲಾದ ವೈಶಿಷ್ಟ್ಯಗಳೊಂದಿಗೆ ನಮ್ಮ ಅತ್ಯಾಧುನಿಕ ಕಲಿಕೆಯ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಅನ್ನು ಅನ್ವೇಷಿಸಿ",
            scroll_explore: "ಅನ್ವೇಷಿಸಲು ಸ್ಕ್ರಾಲ್ ಮಾಡಿ",
            explore: "ಅನ್ವೇಷಿಸಿ",

            // Feature Cards
            blind_assistance: "ದೃಷ್ಟಿ ಸಹಾಯ",
            blind_assistance_msg: "ಇದು ದೃಷ್ಟಿ ಸಹಾಯ",
            blind_assistance_desc: "ದೃಷ್ಟಿ ವಿಕಲಚೇತನ ಬಳಕೆದಾರರಿಗೆ ವಿಶೇಷವಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಲಾದ ಮುಂದುವರಿದ ಸಾಧನಗಳು, ಆಡಿಯೊ ವಿವರಣೆಗಳು ಮತ್ತು ವರ್ಧಿತ ನ್ಯಾವಿಗೇಶನ್ ಬೆಂಬಲವನ್ನು ಒದಗಿಸುತ್ತವೆ.",
            deaf_assistance: "ಶ್ರವಣ ಸಹಾಯ",
            deaf_assistance_msg: "ಇದು ಶ್ರವಣ ಸಹಾಯ",
            deaf_assistance_desc: "ದೃಶ್ಯ ಸೂಚನೆಗಳು, ಟ್ರಾನ್ಸ್‌ಕ್ರಿಪ್ಷನ್ ಸೇವೆಗಳು ಮತ್ತು ಸಂಕೇತ ಭಾಷೆ ಏಕೀಕರಣದೊಂದಿಗೆ ಶ್ರವಣ ದೋಷವುಳ್ಳ ವ್ಯಕ್ತಿಗಳಿಗೆ ಸಮಗ್ರ ಪರಿಹಾರಗಳು.",
            visual_study: "ದೃಶ್ಯ ಅಧ್ಯಯನ",
            visual_study_msg: "ದೃಶ್ಯಗಳ ಮೂಲಕ ಕಲಿಯಿರಿ",
            visual_study_desc: "ಅನಿಮೇಷನ್‌ಗಳು, ಮೈಂಡ್ ಮ್ಯಾಪ್‌ಗಳು, ಇನ್ಫೋಗ್ರಾಫಿಕ್ಸ್ ಮತ್ತು ಗ್ರಾಫ್‌ಗಳನ್ನು ಬಳಸಿಕೊಂಡು ಪರಿಕಲ್ಪನೆ-ಆಧಾರಿತ ದೃಶ್ಯ ಕಲಿಕೆ, ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಉದ್ದನೆಯ ಪಠ್ಯ ಓದದೆ ವೇಗವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
            personalized_learning: "ವೈಯಕ್ತಿಕ ಕಲಿಕೆ",
            personalized_learning_msg: "ಇದು ವೈಯಕ್ತಿಕ ಕಲಿಕೆ",
            personalized_learning_desc: "ಕಸ್ಟಮೈಸ್ ಮಾಡಬಹುದಾದ ಕ್ವಿಜ್‌ಗಳು, ಸಂವಾದಾತ್ಮಕ ಫ್ಲ್ಯಾಷ್‌ಕಾರ್ಡ್‌ಗಳು ಮತ್ತು ಎಲ್ಲಾ ಬಳಕೆದಾರರಿಗೆ ಪ್ರಗತಿ ಟ್ರ್ಯಾಕಿಂಗ್‌ನೊಂದಿಗೆ AI-ಚಾಲಿತ ಕಲಿಕೆಯ ಮಾರ್ಗಗಳು.",

            // Floating Taskbar
            learning_hub: "ಕಲಿಕೆ ಹಬ್",
            assistive_tools: "ಸಹಾಯಕ ಸಾಧನಗಳು",
            entertainment: "ಮನರಂಜನೆ",

            // Search By Topic
            search_by_topic: "ವಿಷಯದ ಮೂಲಕ ಹುಡುಕಿ",
            enter_topic_prompt: "ನೀವು ಕಲಿಯಲು ಬಯಸುವ ವಿಷಯದ ಹೆಸರನ್ನು ದಯವಿಟ್ಟು ನಮೂದಿಸಿ:",
            enter_topic_placeholder: "ವಿಷಯದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ",
            loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
            generating_video: "ವೀಡಿಯೊ ರಚಿಸಲಾಗುತ್ತಿದೆ, ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ...",
            video_placeholder: "ಜನರೇಷನ್ ನಂತರ ವೀಡಿಯೊ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ",
            enter_topic_alert: "ದಯವಿಟ್ಟು ವಿಷಯದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ",
            video_error: "ವೀಡಿಯೊ ಪಡೆಯುವಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ",
            browser_no_video: "ನಿಮ್ಮ ಬ್ರೌಸರ್ ವೀಡಿಯೊ ಟ್ಯಾಗ್ ಅನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ.",

            // Assistive Tools
            welcome_assistive: "ಸಹಾಯಕ ಸಾಧನಗಳಿಗೆ ಸ್ವಾಗತ",
            learning_panel: "ಕಲಿಕೆ ಪ್ಯಾನೆಲ್",
            audio_video_transcriber: "ಆಡಿಯೊ/ವೀಡಿಯೊ ಟ್ರಾನ್ಸ್‌ಕ್ರೈಬರ್",
            voice_to_gesture: "ವಾಯ್ಸ್-ಟು-ಜೆಸ್ಚರ್",
            sign_language_dictionary: "ಸಂಕೇತ ಭಾಷೆ ನಿಘಂಟು",
            upload_transcription: "ಟ್ರಾನ್ಸ್‌ಕ್ರಿಪ್ಷನ್ ಪಡೆಯಲು ಆಡಿಯೊ ಅಥವಾ ವೀಡಿಯೊ ಫೈಲ್ ಅನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
            choose_file: "ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ",
            selected_file: "ಆಯ್ಕೆ ಮಾಡಿದ ಫೈಲ್:",
            upload: "ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
            no_file_selected: "ದೋಷ: ಯಾವುದೇ ಫೈಲ್ ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ",
            uploading: "ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
            upload_success: "ಯಶಸ್ವಿಯಾಗಿ ಅಪ್‌ಲೋಡ್ ಆಗಿದೆ",
            upload_error: "ಅಪ್‌ಲೋಡ್‌ನಲ್ಲಿ ದೋಷ",
            no_file_mcqs: "ದೋಷ: MCQ ಜನರೇಷನ್‌ಗಾಗಿ ಯಾವುದೇ ಫೈಲ್ ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ",
            error_mcqs: "MCQ ರಚಿಸುವಲ್ಲಿ ದೋಷ",
            no_file_summary: "ದೋಷ: ಸಾರಾಂಶಕ್ಕಾಗಿ ಯಾವುದೇ ಫೈಲ್ ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ",
            error_summary: "ಸಾರಾಂಶ ರಚಿಸುವಲ್ಲಿ ದೋಷ",
            no_file_flashcards: "ದೋಷ: ಫ್ಲ್ಯಾಷ್‌ಕಾರ್ಡ್ ಜನರೇಷನ್‌ಗಾಗಿ ಯಾವುದೇ ಫೈಲ್ ಆಯ್ಕೆ ಮಾಡಿಲ್ಲ",
            error_flashcards: "ಫ್ಲ್ಯಾಷ್‌ಕಾರ್ಡ್ ರಚಿಸುವಲ್ಲಿ ದೋಷ",
            unknown_view: "ಅಪರಿಚಿತ ನೋಟ"
        }
    }
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    })

export default i18n
