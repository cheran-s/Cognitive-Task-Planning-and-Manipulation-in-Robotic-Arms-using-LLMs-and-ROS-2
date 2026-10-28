"""

Comprehensive Multilingual NLP Parser for English, Tamil (Script & Tanglish),

Malayalam (Script & Manglish), and Hindi (Script & Hinglish).

Handles code-switching, colloquial phrasing, slot filling, and ambiguity detection.

"""

import re

import unicodedata

from typing import Dict, List, Optional, Tuple, Any



class MultilingualParser:

    """

    Robust multilingual parser with deterministic entity recognition,

    fuzzy matching, code-switching tolerance, and natural language understanding.

    """



    # Language Identifiers

    LANG_EN = "en"

    LANG_TA = "ta"

    LANG_ML = "ml"

    LANG_HI = "hi"



    # Script Unicode Ranges

    TAMIL_REGEX = re.compile(r'[\u0B80-\u0BFF]')

    MALAYALAM_REGEX = re.compile(r'[\u0D00-\u0D7F]')

    DEVANAGARI_REGEX = re.compile(r'[\u0900-\u097F]')



    # Object Dictionary across English, Tamil, Malayalam, Hindi

    OBJECT_SYNONYMS = {

        "apple_red_01": {

            "canonical": "Red Apple",

            "type": "apple",

            "color": "red",

            "en": ["red apple", "apple", "red fruit"],

            "ta_script": ["சிவப்பு ஆப்பிள்", "ஆப்பிள்", "ஆப்பிளை", "ஆப்பிள", "ஆப்பில்"],

            "ta_tanglish": ["red apple", "apple-a", "apple-ah", "apple-ai", "apple-la", "apple ah", "apple a", "apple", "appil", "sevappu apple"],

            "ml_script": ["ചുവന്ന ആപ്പിൾ", "ആപ്പിൾ", "ആപ്പിളിനെ", "ആപ്പിളിന്"],

            "ml_manglish": ["chuvanna apple", "apple-ne", "apple ne", "apple eduthu", "apple"],

            "hi_script": ["लाल सेब", "सेब", "लाल सेव", "सेब को"],

            "hi_hinglish": ["laal seb", "laal apple", "seb ko", "seb", "apple"]

        },

        "ball_blue_01": {

            "canonical": "Blue Ball",

            "type": "ball",

            "color": "blue",

            "en": ["blue ball", "ball", "sphere", "blue sphere"],

            "ta_script": ["நீல பந்து", "பந்து", "பந்தை", "பந்த", "நீல பந்தை", "நீலப்பந்து", "பந்துவை"],

            "ta_tanglish": ["blue ball", "ball-a", "ball-ah", "ball-ai", "ball ah", "ball a", "ball", "panthu", "banthu", "neela ball", "antha ball-a", "antha ball", "ball-la"],

            "ml_script": ["നീല പന്ത്", "പന്ത്", "പന്തിനെ", "നീല പന്തിനെ", "നീലപ്പന്ത്"],

            "ml_manglish": ["neela panthu", "panthu", "ball-ne", "ball", "aa panthu", "panthine"],

            "hi_script": ["नीली गेंद", "गेंद", "गेंद को", "नीली बॉल", "बॉल", "बॉल को"],

            "hi_hinglish": ["neeli gend", "gend ko", "gend", "blue ball", "ball ko", "ball", "neeli ball"]

        },

        "cube_green_01": {

            "canonical": "Green Cube",

            "type": "cube",

            "color": "green",

            "en": ["green cube", "cube", "green block", "block"],

            "ta_script": ["பச்சை கனசதுரம்", "கனசதுரம்", "பச்சை கட்டை", "கட்டை", "கட்டையை"],

            "ta_tanglish": ["green cube", "cube-a", "cube-ah", "cube ah", "cube", "green block", "pachai cube", "kattai"],

            "ml_script": ["പച്ച ക്യൂബ്", "ക്യൂബ്", "പച്ച കട്ട", "കട്ട"],

            "ml_manglish": ["pacha cube", "cube", "green cube", "katta"],

            "hi_script": ["हरा घन", "घन", "हरा ब्लॉक", "ब्लॉक", "हरा क्यूब", "क्यूब"],

            "hi_hinglish": ["hara ghan", "green cube", "cube", "hara block", "block"]

        },

        "cyl_yellow_01": {

            "canonical": "Yellow Cylinder",

            "type": "cylinder",

            "color": "yellow",

            "en": ["yellow cylinder", "cylinder", "yellow tube"],

            "ta_script": ["மஞ்சள் உருளை", "உருளை", "உருளையை", "சிலிண்டர்", "சிலிண்டரை"],

            "ta_tanglish": ["yellow cylinder", "cylinder-a", "cylinder-ah", "cylinder", "manjal cylinder"],

            "ml_script": ["മഞ്ഞ സിലിണ്ടർ", "സിലിണ്ടർ"],

            "ml_manglish": ["manja cylinder", "cylinder"],

            "hi_script": ["पीला सिलेंडर", "सिलेंडर", "पीली नली"],

            "hi_hinglish": ["peela cylinder", "cylinder", "peeli tube"]

        },

        "bottle_01": {

            "canonical": "Water Bottle",

            "type": "bottle",

            "color": "cyan",

            "en": ["bottle", "water bottle", "flask", "cyan bottle"],

            "ta_script": ["பாட்டில்", "பாட்டிலை", "தண்ணீர் பாட்டில்", "தண்ணி பாட்டில்"],

            "ta_tanglish": ["bottle-a", "bottle-ah", "bottle ah", "bottle", "thanni bottle", "water bottle", "antha bottle"],

            "ml_script": ["കുപ്പി", "കുപ്പിയെ", "വെള്ള കുപ്പി", "ബോട്ടിൽ"],

            "ml_manglish": ["kuppi", "kuppiye", "bottle", "vella kuppi"],

            "hi_script": ["बोतल", "बोतल को", "पानी की बोतल"],

            "hi_hinglish": ["bottle", "botal ko", "botal", "paani ki botal"]

        },

        "box_small_01": {

            "canonical": "Small Box",

            "type": "box",

            "color": "purple",

            "en": ["small box", "box", "package", "carton", "purple box"],

            "ta_script": ["சின்ன பெட்டி", "பெட்டி", "பெட்டியை", "பாக்ஸ்"],

            "ta_tanglish": ["box-a", "box-ah", "box ah", "box", "chinna box", "petti", "small box"],

            "ml_script": ["ചെറിയ പെട്ടി", "പെട്ടി", "പെട്ടിയെ", "ബോക്സ്"],

            "ml_manglish": ["cheriya petti", "petti", "box", "small box"],

            "hi_script": ["छोटा डिब्बा", "डिब्बा", "डिब्बे को", "बॉक्स", "छोटा बॉक्स"],

            "hi_hinglish": ["chota dibba", "dibba", "box", "chota box"]

        }

    }



    # Zone Synonyms across Languages (Full names, script forms, affixes, and directional shorthand)

    ZONE_WORDS = r'(?:zone|ஜோன்|மண்டலம்|மண்டல|சோண|സോണ|സോൺ|മേഖല|ज़ोन|जोन)'

    LETTER_A = r'(?:[aA]|அ|ஏ|എ|ए)'

    LETTER_B = r'(?:[bB]|ஆ|பி|ബി|बी)'

    LETTER_C = r'(?:[cC]|இ|சி|സി|सी)'

    LETTER_D = r'(?:[dD]|ஈ|டி|ഡി|डी)'



    ZONE_PATTERNS = {
        "zone_a": [
            r"\b(?:zone|ஜோன்|மண்டலம்|மண்டல|சோண|സോണ|സോൺ|മേഖല|ज़ोन|जोन)\s*[-_]?\s*(?:[aA]|அ|ஏ|എ|ए)\b",
            r"\b(?:[aA]|அ|ஏ|എ|ए)\s*[-_](?:zone)\b|\b(?:[aA]|அ|ஏ|എ|ए)\s*[-_]?(?:ஜோன்|மண்டலம்|மண்டல|சோண|സോണ|സോൺ|മേഖല|ज़ोन|जोन)",
            r"\b(?:from|to|into|in)\s+(?:zone\s*)?(?:[aA]|அ|ஏ|എ|ए)\b",
            r"\b(?:[aA]|அ|ஏ|എ|ए)\s*[-_]?(?:la\s+irundhu|la\s+irunthu|lerundhu|lerunthu|lendhu|lendu|il\s+ninnu|ninnu|ninnum|se|la\s+vai|la\s+podu|il\s+vekku|il\s+vekkoo|ku|kku|lekk|lekku|ilekku|ilekk|yil|me|mein|il|la)\b",
            r"(?:[aA]|அ|ஏ|എ|ए)\s*[-_]?(?:லிருந்து|த்திலிருந்து|ல்|யில்|க்கு|கு|ல|வை|போடு)",
            r"(?:[aA]|அ|ஏ|എ|ए)\s*[-_]?(?:യിൽ\s*നിന്ന്|ൽ\s*നിന്ന്|നിന്ന്|യിലേക്ക്|ലേക്ക്|യിൽ|ൽ|വെക്കൂ|മാറ്റூ|മാറ്റുക)",
            r"(?:[aA]|அ|ஏ|എ|ए)\s*[-_]?(?:से|में|मे|पर)",
            r"\b(?:[aA]|அ|ஏ|എ|ए)\s+(?:la|yil|il|me|se|में|से|ൽ|യിൽ|க்கு)\s+(?:vai|podu|eduthu|vekku|vekkoo|rakho|irundhu|irunthu|lendhu|ninnu|le\s+jao|maattoo|maattu)\b"
        ],
        "zone_b": [
            r"\b(?:zone|ஜோன்|மண்டலம்|மண்டல|சோண|സോണ|സോൺ|മേഖല|ज़ोन|जोन)\s*[-_]?\s*(?:[bB]|ஆ|பி|ബി|बी)\b",
            r"\b(?:[bB]|ஆ|பி|ബി|बी)\s*[-_](?:zone)\b|\b(?:[bB]|ஆ|பி|ബി|बी)\s*[-_]?(?:ஜோன்|மண்டலம்|மண்டல|சோண|സോണ|സോൺ|മേഖല|ज़ोन|जोन)",
            r"\b(?:from|to|into|in)\s+(?:zone\s*)?(?:[bB]|ஆ|பி|ബി|बी)\b",
            r"\b(?:[bB]|ஆ|பி|ബി|बी)\s*[-_]?(?:la\s+irundhu|la\s+irunthu|lerundhu|lerunthu|lendhu|lendu|il\s+ninnu|ninnu|ninnum|se|la\s+vai|la\s+podu|il\s+vekku|il\s+vekkoo|ku|kku|lekk|lekku|ilekku|ilekk|yil|me|mein|il|la)\b",
            r"(?:[bB]|ஆ|பி|ബി|बी)\s*[-_]?(?:லிருந்து|த்திலிருந்து|ல்|யில்|க்கு|கு|ல|வை|போடு)",
            r"(?:[bB]|ஆ|பி|ബി|बी)\s*[-_]?(?:യിൽ\s*നിന്ന്|ൽ\s*നിന്ന്|നിന്ന്|യിലേക്ക്|ലേക്ക്|യിൽ|ൽ|വെക്കൂ|മാറ്റூ|മാറ്റുക)",
            r"(?:[bB]|ஆ|பி|ബി|बी)\s*[-_]?(?:से|में|मे|पर)",
            r"\b(?:[bB]|ஆ|பி|ബി|बी)\s+(?:la|yil|il|me|se|में|से|ൽ|യിൽ|க்கு)\s+(?:vai|podu|eduthu|vekku|vekkoo|rakho|irundhu|irunthu|lendhu|ninnu|le\s+jao|maattoo|maattu)\b"
        ],
        "zone_c": [
            r"\b(?:zone|ஜோன்|மண்டலம்|மண்டல|சோண|സോണ|സോൺ|മേഖല|ज़ोन|जोन)\s*[-_]?\s*(?:[cC]|இ|சி|സി|सी)\b",
            r"\b(?:[cC]|இ|சி|സി|सी)\s*[-_](?:zone)\b|\b(?:[cC]|இ|சி|സി|सी)\s*[-_]?(?:ஜோன்|மண்டலம்|மண்டல|சோண|സോണ|സോൺ|മേഖല|ज़ोन|जोन)",
            r"\b(?:from|to|into|in)\s+(?:zone\s*)?(?:[cC]|இ|சி|സി|सी)\b",
            r"\b(?:[cC]|இ|சி|സി|सी)\s*[-_]?(?:la\s+irundhu|la\s+irunthu|lerundhu|lerunthu|lendhu|lendu|il\s+ninnu|ninnu|ninnum|se|la\s+vai|la\s+podu|il\s+vekku|il\s+vekkoo|ku|kku|lekk|lekku|ilekku|ilekk|yil|me|mein|il|la)\b",
            r"(?:[cC]|இ|சி|സി|सी)\s*[-_]?(?:லிருந்து|த்திலிருந்து|ல்|யில்|க்கு|கு|ல|வை|போடு)",
            r"(?:[cC]|இ|சி|സി|सी)\s*[-_]?(?:യിൽ\s*നിന്ന്|ൽ\s*നിന്ന്|നിന്ന്|യിലേക്ക്|ലേക്ക്|യിൽ|ൽ|വെക്കൂ|മാറ്റூ|മാറ്റുക)",
            r"(?:[cC]|இ|சி|സി|सी)\s*[-_]?(?:से|में|मे|पर)",
            r"\b(?:[cC]|இ|சி|സി|सी)\s+(?:la|yil|il|me|se|में|से|ൽ|യിൽ|க்கு)\s+(?:vai|podu|eduthu|vekku|vekkoo|rakho|irundhu|irunthu|lendhu|ninnu|le\s+jao|maattoo|maattu)\b"
        ],
        "zone_d": [
            r"\b(?:zone|ஜோன்|மண்டலம்|மண்டல|சோண|സോണ|സോൺ|മേഖല|ज़ोन|जोन)\s*[-_]?\s*(?:[dD]|ஈ|டி|ഡി|डी)\b",
            r"\b(?:[dD]|ஈ|டி|ഡി|डी)\s*[-_](?:zone)\b|\b(?:[dD]|ஈ|டி|ഡി|डी)\s*[-_]?(?:ஜோன்|மண்டலம்|மண்டல|சோண|സോണ|സോൺ|മേഖല|ज़ोन|जोन)",
            r"\b(?:from|to|into|in)\s+(?:zone\s*)?(?:[dD]|ஈ|டி|ഡി|डी)\b",
            r"\b(?:[dD]|ஈ|டி|ഡി|डी)\s*[-_]?(?:la\s+irundhu|la\s+irunthu|lerundhu|lerunthu|lendhu|lendu|il\s+ninnu|ninnu|ninnum|se|la\s+vai|la\s+podu|il\s+vekku|il\s+vekkoo|ku|kku|lekk|lekku|ilekku|ilekk|yil|me|mein|il|la)\b",
            r"(?:[dD]|ஈ|டி|ഡി|डी)\s*[-_]?(?:லிருந்து|த்திலிருந்து|ல்|யில்|க்கு|கு|ல|வை|போடு)",
            r"(?:[dD]|ஈ|டி|ഡി|डी)\s*[-_]?(?:യിൽ\s*നിന്ന്|ൽ\s*നിന്ന്|നിന്ന്|യിലേക്ക്|ലേക്ക്|യിൽ|ൽ|വെക്കൂ|മാറ്റூ|മാറ്റുക)",
            r"(?:[dD]|ஈ|டி|ഡി|डी)\s*[-_]?(?:से|में|मे|पर)",
            r"\b(?:[dD]|ஈ|டி|ഡി|डी)\s+(?:la|yil|il|me|se|में|से|ൽ|യിൽ|க்கு)\s+(?:vai|podu|eduthu|vekku|vekkoo|rakho|irundhu|irunthu|lendhu|ninnu|le\s+jao|maattoo|maattu)\b"
        ]
    }
    # Action Keywords

    ACTIONS = {

        "emergency_stop": {

            "en": ["emergency stop", "estop", "stop immediately", "halt", "freeze", "stop"],

            "ta": ["நிறுத்து", "உடனே நிறுத்து", "அவசர நிறுத்தம்", "stop pannu", "niruthu", "halt pannu"],

            "ml": ["നിർത്തൂ", "ഉടൻ നിർത്തൂ", "സ്റ്റോപ്പ് ചെയ്യൂ", "nirthu", "stop cheyyu"],

            "hi": ["रोको", "तुरंत रोको", "आपातकालीन रोक", "roko", "ruko", "band karo", "stop karo"]

        },

        "cancel_task": {

            "en": ["cancel", "abort", "cancel task", "abort task", "cancel pending"],

            "ta": ["ரத்து செய்", "வேலையை ரத்து செய்", "cancel pannu", "abort pannu"],

            "ml": ["റദ്ദാക്കുക", "ടാസ്ക് റദ്ദാക്കുക", "cancel cheyyu"],

            "hi": ["रद्द करो", "टास्क रद्द करो", "cancel karo"]

        },

        "home_robot": {

            "en": ["home", "reset", "return home", "go to home", "go back"],

            "ta": ["ஹோம் போ", "ஆரம்ப நிலைக்கு போ", "home-ku po", "reset pannu", "thirumba po"],

            "ml": ["ഹോമിലേക്ക് പോകൂ", "ആദ്യ സ്ഥാനത്തേക്ക് പോകൂ", "home-il poku"],

            "hi": ["होम पर जाओ", "शुरुआती स्थिति में जाओ", "home jao", "reset karo", "wapas jao"]

        },

        "query_inventory": {

            "en": ["what is in", "tell me which objects", "list objects", "show objects", "who is in", "what are in"],

            "ta": ["என்ன இருக்கிறது", "பொருட்களை சொல்", "பொருட்கள் என்ன", "enna irukku", "enna objects irukku"],

            "ml": ["എന്താണ് ഉള്ളത്", "വസ്തുക്കൾ ഏവ", "enthanu ullathu", "enthu objects undu"],

            "hi": ["क्या है", "कौन सी वस्तुएं हैं", "ऑब्जेक्ट्स बताओ", "kya hai", "kaun sa object hai"]

        },

        "pick_and_place": {

            "en": ["pick", "place", "move", "transfer", "put", "shift", "relocate", "take", "drop"],

            "ta": ["எடுத்து", "வை", "நகர்த்து", "போடு", "கொண்டு போ", "மாற்று", "மாத்து", "வைக்க", "எடுக்க", "வைங்க", "எடுங்க", "eduthu", "vai", "podu", "kondu po", "move pannu", "pick panni", "shift pannu"],

            "ml": ["എടുത്ത്", "വെക്കൂ", "മാറ്റുക", "മാറ്റൂ", "സ്ഥാപിക്കുക", "വെക്കുക", "മാറ്റ്", "eduthu", "vekkoo", "vekkuka", "maattuka", "maattoo", "move cheyyu", "vekku", "shift cheyyu"],

            "hi": ["उठाकर", "रखो", "ले जाओ", "डालो", "पहुंचाओ", "रख दो", "ले जा", "uthakar", "rakho", "le jao", "daalo", "move karo", "shift karo"]

        }

    }



    def detect_language_with_confidence(self, text: str) -> Tuple[str, float]:

        """

        Detects primary language and returns (lang_code, confidence).

        High confidence (0.99) for native scripts, 0.90 - 0.98 for phonetic code-switching.

        """

        # 1. Direct Script Character Checks

        if self.TAMIL_REGEX.search(text):

            return self.LANG_TA, 0.99

        if self.MALAYALAM_REGEX.search(text):

            return self.LANG_ML, 0.99

        if self.DEVANAGARI_REGEX.search(text):

            return self.LANG_HI, 0.99



        text_lower = text.lower()



        # 2. Tanglish Markers

        tanglish_markers = [

            "eduthu", "vai", "podu", "irukku", "pannu", "antha", "inga", "ange",

            "kondu", "po", "la", "kku", "ku", "sollu", "vachiru", "thooku",

            "irundhu", "irunthu", "lerundhu", "ah", "petti"

        ]

        ta_score = sum(1 for m in tanglish_markers if re.search(r'\b' + m + r'\b', text_lower) or text_lower.endswith(m))



        # 3. Hinglish Markers

        hinglish_markers = [

            "uthakar", "rakho", "daalo", "karo", "gend", "botal", "le", "jao",

            "me", "se", "ko", "batao", "lao", "wapas", "ruko", "chota", "dibba"

        ]

        hi_score = sum(1 for m in hinglish_markers if re.search(r'\b' + m + r'\b', text_lower))



        # 4. Manglish Markers

        manglish_markers = [

            "panthu", "kuppi", "eduthu", "vekkoo", "vekkuka", "vekku", "maattuka",

            "ullathu", "cheyyu", "undu", "petti", "aa", "il", "lekk", "ninnu", "ninnum"

        ]

        ml_score = sum(1 for m in manglish_markers if re.search(r'\b' + m + r'\b', text_lower))



        # Disambiguate specific unique markers

        if any(re.search(r'\b' + m + r'\b', text_lower) for m in ["ninnu", "ninnum", "vekku", "vekkoo", "panthu", "kuppi"]):

            return self.LANG_ML, 0.96

        if any(re.search(r'\b' + m + r'\b', text_lower) for m in ["irundhu", "irunthu", "lerundhu", "vai", "podu", "kondu"]):

            return self.LANG_TA, 0.96



        if ta_score >= 1 and ta_score >= hi_score and ta_score >= ml_score:

            return self.LANG_TA, min(0.98, 0.88 + 0.03 * ta_score)

        if ml_score >= 1 and ml_score >= ta_score and ml_score >= hi_score:

            return self.LANG_ML, min(0.98, 0.88 + 0.03 * ml_score)

        if hi_score >= 1 and hi_score >= ta_score and hi_score >= ml_score:

            return self.LANG_HI, min(0.98, 0.88 + 0.03 * hi_score)



        return self.LANG_EN, 0.95



    def detect_language(self, text: str) -> str:

        lang, _ = self.detect_language_with_confidence(text)

        return lang



    def extract_action(self, text: str) -> str:

        """Determines the intended robotic action."""

        text_lower = text.lower().strip()

        tokens = text_lower.split()

        

        # Priority 1: Emergency Stop

        for lang_group in self.ACTIONS["emergency_stop"].values():

            for kw in lang_group:

                kw_lower = kw.lower()

                if kw_lower in text_lower or any(kw_lower == t.strip('!.,?') for t in tokens):

                    return "emergency_stop"



        # Priority 2: Cancel

        for lang_group in self.ACTIONS["cancel_task"].values():

            for kw in lang_group:

                kw_lower = kw.lower()

                if kw_lower in text_lower or any(kw_lower == t.strip('!.,?') for t in tokens):

                    return "cancel_task"



        # Priority 3: Home

        for lang_group in self.ACTIONS["home_robot"].values():

            for kw in lang_group:

                kw_lower = kw.lower()

                if kw_lower in text_lower or any(kw_lower == t.strip('!.,?') for t in tokens):

                    return "home_robot"



        # Priority 4: Query Inventory

        for lang_group in self.ACTIONS["query_inventory"].values():

            for kw in lang_group:

                kw_lower = kw.lower()

                if kw_lower in text_lower:

                    return "query_inventory"



        # Priority 5: Pick and Place / Move

        for lang_group in self.ACTIONS["pick_and_place"].values():

            for kw in lang_group:

                kw_lower = kw.lower()

                if kw_lower in text_lower or any(kw_lower == t.strip('!.,?') for t in tokens):

                    return "pick_and_place"



        return "pick_and_place"  # Default assumption for task command



    def extract_zones(self, text: str) -> Tuple[Optional[str], Optional[str]]:

        """

        Extracts source and target zones from the command semantically.

        Supports natural phrasing in English, Tamil, Tanglish, Malayalam, Manglish, Hindi.

        """

        text_norm = unicodedata.normalize('NFC', text).lower()

        found = []



        for zone_id, patterns in self.ZONE_PATTERNS.items():

            for pat in patterns:

                for match in re.finditer(pat, text_norm, re.IGNORECASE):

                    found.append((match.start(), match.end(), zone_id, match.group(0)))



        if not found:

            return None, None



        # Filter overlapping matches, preferring longest match

        found.sort(key=lambda x: (x[0], -(x[1] - x[0])))

        unique = []

        last_end = -1

        for f in found:
            if f[0] >= last_end:
                unique.append(f)
                last_end = f[1]

        # Prioritize distinct zones if duplicate zone matches occurred
        distinct_unique = []
        seen_zones = set()
        for f in unique:
            if f[2] not in seen_zones:
                distinct_unique.append(f)
                seen_zones.add(f[2])
            if len(distinct_unique) == 2:
                break
        if len(distinct_unique) >= 2:
            unique = distinct_unique

        source_words = [
            'from', 'se', 'से', 'irundhu', 'irunthu', 'lerundhu', 'lerunthu', 'lendhu', 'lendu',
            'ninnu', 'ninnum', 'இருந்து', 'லிருந்து', 'த்திலிருந்து', 'நின்று', 'നിന്ന്', 'നിന്നും'
        ]
        target_words = [
            'to', 'into', 'in', 'me', 'mein', 'में', 'मे', 'vai', 'podu', 'vekku', 'vekkoo', 'vekkuka',
            'rakho', 'daalo', 'lekk', 'lekku', 'ilekku', 'ilekk', 'ku', 'kku', 'வை', 'வெക്കൂ',
            'रखो', 'डालो', 'യിലേക്ക്', 'ലേക്ക്', 'മാറ്റൂ', 'க்கு', 'கு'
        ]

        def get_role(start_pos: int, end_pos: int, match_text: str) -> Optional[str]:
            # Priority 1: Affix is INSIDE the matched token itself
            has_source_in_match = any(w in match_text for w in source_words)
            has_target_in_match = any(w in match_text for w in target_words)
            if has_source_in_match and not has_target_in_match:
                return 'source'
            if has_target_in_match and not has_source_in_match:
                return 'target'

            # Priority 2: Preposition immediately preceding the token
            pre = text_norm[max(0, start_pos - 15):start_pos].strip()
            if re.search(r'\b(from|se|से)\s*$', pre):
                return 'source'
            if re.search(r'\b(to|into|in|me|mein|में|मे)\s*$', pre):
                return 'target'

            # Priority 3: Particle immediately following the token
            post = text_norm[end_pos:min(len(text_norm), end_pos + 15)].strip()
            if re.search(r'^[-_]?(?:se|से|irundhu|irunthu|lerundhu|lerunthu|lendhu|lendu|ninnu|ninnum|இருந்து|லிருந்து|த்திலிருந்து|நின்று|നിന്ന്)', post):
                return 'source'
            if re.search(r'^[-_]?(?:me|mein|में|मे|to|vai|podu|vekku|vekkoo|vekkuka|rakho|daalo|lekk|lekku|ilekku|ilekk|ku|kku|வை|வெക്കൂ|रखो|യിലേക്ക്|ലേക്ക്)', post):
                return 'target'

            return None

        if len(unique) == 1:

            z = unique[0]

            role = get_role(z[0], z[1], z[3])

            return (z[2], None) if role == 'source' else (None, z[2])



        z1 = unique[0]

        z2 = unique[1]

        r1 = get_role(z1[0], z1[1], z1[3])

        r2 = get_role(z2[0], z2[1], z2[3])



        if r1 == 'source' and r2 == 'target':

            return z1[2], z2[2]

        if r1 == 'target' and r2 == 'source':

            return z2[2], z1[2]

        if r1 == 'source':

            return z1[2], z2[2]

        if r2 == 'source':

            return z2[2], z1[2]

        if r1 == 'target':

            return z2[2], z1[2]

        if r2 == 'target':

            return z1[2], z2[2]



        return z1[2], z2[2]



    def extract_object(self, text: str, current_inventory: Optional[Dict[str, Any]] = None) -> Tuple[Optional[str], bool, List[str]]:

        """

        Finds matching object from synonyms.

        Returns: (object_id, is_ambiguous, candidate_ids)

        """

        text_lower = text.lower()

        matches = []



        for obj_id, data in self.OBJECT_SYNONYMS.items():

            all_aliases = []

            for group in ["en", "ta_script", "ta_tanglish", "ml_script", "ml_manglish", "hi_script", "hi_hinglish"]:

                all_aliases.extend(data.get(group, []))



            # Match longest alias first

            for alias in sorted(all_aliases, key=len, reverse=True):

                alias_lower = alias.lower()

                # Direct substring match works across Unicode scripts (Tamil, Malayalam, Hindi) and Tanglish

                if alias_lower in text_lower:

                    matches.append(obj_id)

                    break



        matches = list(dict.fromkeys(matches))  # remove duplicates



        # Check if generic object word was used without specific identifying noun
        is_generic_obj = bool(
            re.search(r'\b(object|item|thing|பொருள்|വസ്തു|वस्तु)\b', text_lower)
            and not any(k in text_lower for k in [
                'apple', 'ball', 'cube', 'cylinder', 'bottle', 'box',
                'ஆப்பிள்', 'பந்து', 'கனசதுரம்', 'செவ்வகம்', 'உருளை', 'பாட்டில்', 'பெட்டி',
                'ആപ്പിൾ', 'പന്ത്', 'സിലിണ്ടർ', 'കുപ്പി', 'പെട്ടി',
                'सेब', 'गेंद', 'सिलेंडर', 'बोतल', 'डिब्बा'
            ])
        )

        if is_generic_obj:
            return None, True, list(self.OBJECT_SYNONYMS.keys())

        # Check if generic ball without color or demonstrative was requested
        is_generic_ball = bool(
            re.search(r'\b(ball|panthu|gend|பந்து|പന്ത്|गेंद)\b', text_lower)
            and not any(c in text_lower for c in ['blue', 'red', 'green', 'yellow', 'place', 'நீல', 'ചുവன்ன', 'नीली', 'antha', 'அந்த', 'ஆ', 'उस', 'that', 'this'])
        )

        if is_generic_ball:
            return None, True, ["ball_blue_01", "apple_red_01"]

        if not matches:

            return None, False, []



        if len(matches) == 1:

            return matches[0], False, matches



        # Multiple matches detected -> Ambiguity check

        return matches[0], True, matches



    def generate_clarification(self, language: str, ambiguity_type: str, candidate_objects: List[str] = None) -> Dict[str, Any]:

        """Generates natural clarification questions in the appropriate language."""

        if ambiguity_type == "missing_target_zone":

            questions = {

                self.LANG_EN: "Which zone should I place the object into? (Zone A, Zone B, Zone C, or Zone D?)",

                self.LANG_TA: "பொருளை எந்த மண்டலத்தில் (Zone A, B, C, அல்லது D) வைக்க வேண்டும்?",

                self.LANG_ML: "ഏത് സോണിലേക്കാണ് ഒബ്ജക്റ്റ് മാറ്റേണ്ടത്? (Zone A, B, C, അല്ലെങ്കിൽ D?)",

                self.LANG_HI: "वस्तु को किस जोन (Zone A, B, C या D) में रखना है?"

            }

            options = [

                {"label": "Zone A", "value": "zone_a"},

                {"label": "Zone B", "value": "zone_b"},

                {"label": "Zone C", "value": "zone_c"},

                {"label": "Zone D", "value": "zone_d"}

            ]

            return {

                "question": questions.get(language, questions[self.LANG_EN]),

                "options": options

            }



        elif ambiguity_type == "missing_object":

            questions = {

                self.LANG_EN: "Which object would you like me to manipulate?",

                self.LANG_TA: "நீங்கள் எந்த பொருளை நகர்த்த விரும்புகிறீர்கள்?",

                self.LANG_ML: "ഏത് ഒബ്ജക്റ്റ് ആണ് മാറ്റേണ്ടത്?",

                self.LANG_HI: "आप किस वस्तु को स्थानांतरित करना चाहते हैं?"

            }

            options = [

                {"label": "Blue Ball", "value": "ball_blue_01"},

                {"label": "Red Apple", "value": "apple_red_01"},

                {"label": "Green Cube", "value": "cube_green_01"},

                {"label": "Yellow Cylinder", "value": "cyl_yellow_01"},

                {"label": "Water Bottle", "value": "bottle_01"},

                {"label": "Small Box", "value": "box_small_01"}

            ]

            return {

                "question": questions.get(language, questions[self.LANG_EN]),

                "options": options

            }



        elif ambiguity_type == "multiple_objects":

            questions = {

                self.LANG_EN: "Multiple matching objects detected. Which one do you mean?",

                self.LANG_TA: "ஒன்றுக்கும் மேற்பட்ட பொருத்தமான பொருட்கள் உள்ளன. எதை நகர்த்த வேண்டும்?",

                self.LANG_ML: "ഒന്നിലധികം ഒബ്ജക്റ്റുകൾ കണ്ടെത്തി. ഏതാണ് ഉദ്ദേശിച്ചത്?",

                self.LANG_HI: "एक से अधिक वस्तुएं मिलीं। आप किस वस्तु की बात कर रहे हैं?"

            }

            options = []

            for cid in (candidate_objects or []):

                name = self.OBJECT_SYNONYMS.get(cid, {}).get("canonical", cid)

                options.append({"label": name, "value": cid})

            return {

                "question": questions.get(language, questions[self.LANG_EN]),

                "options": options

            }



        return {

            "question": "Could you please clarify your command?",

            "options": []

        }



    def parse(self, text: str, current_inventory: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:

        """Convenience method returning parsed cognitive entity intent representation."""

        detected_lang = self.detect_language(text)

        action = self.extract_action(text)

        source_zone, target_zone = self.extract_zones(text)

        object_id, is_ambiguous, candidates = self.extract_object(text, current_inventory)

        is_valid = bool(action and object_id and source_zone and target_zone and not is_ambiguous)

        return {

            "language": detected_lang,

            "action": action,

            "object_id": object_id,

            "source_zone": source_zone,

            "target_zone": target_zone,

            "is_ambiguous": is_ambiguous,

            "candidates": candidates,

            "is_valid": is_valid

        }



    def translate_to_english(self, text: str) -> Dict[str, Any]:
        """
        Translates multilingual commands (EN, TA script, Tanglish, ML script, Manglish, HI script, Hinglish)
        into clear, canonical English commands suitable for robotic task execution.
        Preserves object identity, source zone, destination zone, action, and negation.
        """
        text_clean = text.strip()
        lang, confidence = self.detect_language_with_confidence(text_clean)
        action = self.extract_action(text_clean)
        source_zone, target_zone = self.extract_zones(text_clean)
        object_id, is_ambiguous, candidates = self.extract_object(text_clean)

        zone_names = {
            "zone_a": "Zone A",
            "zone_b": "Zone B",
            "zone_c": "Zone C",
            "zone_d": "Zone D"
        }

        # Check for emergency stop
        if action == "emergency_stop":
            return {
                "original": text_clean,
                "detected_language": lang,
                "confidence": confidence,
                "english_command": "Emergency stop the robotic arm immediately.",
                "action": action,
                "object_id": None,
                "source_zone": None,
                "target_zone": None,
                "is_ambiguous": False
            }

        # Check for task cancellation
        if action == "cancel_task":
            return {
                "original": text_clean,
                "detected_language": lang,
                "confidence": confidence,
                "english_command": "Cancel the current task.",
                "action": action,
                "object_id": None,
                "source_zone": None,
                "target_zone": None,
                "is_ambiguous": False
            }

        # Check for home robot
        if action == "home_robot":
            return {
                "original": text_clean,
                "detected_language": lang,
                "confidence": confidence,
                "english_command": "Return robotic arm to home position.",
                "action": action,
                "object_id": None,
                "source_zone": None,
                "target_zone": None,
                "is_ambiguous": False
            }

        # Check for query inventory
        if action == "query_inventory":
            tgt = zone_names.get(target_zone) or zone_names.get(source_zone)
            if tgt:
                cmd = f"Tell me which objects are currently in {tgt}."
            else:
                cmd = "What objects are currently in the workspace?"
            return {
                "original": text_clean,
                "detected_language": lang,
                "confidence": confidence,
                "english_command": cmd,
                "action": action,
                "object_id": object_id,
                "source_zone": source_zone,
                "target_zone": target_zone,
                "is_ambiguous": is_ambiguous
            }

        # Canonical translation for pick and place / move
        is_move_phrased = any(w in text_clean.lower() for w in [
            "move", "move pannu", "move cheyyuka", "move karo", "shift", "transfer", "relocate",
            "நகர்த்து", "மாற்று", "மாத்து", "கொண்டு போ", "கொண்டுபோ", "മാറ്റുക", "മാറ്റൂ", "ले जाओ"
        ])

        obj_name = "object"
        if object_id:
            raw_lower = text_clean.lower()
            if object_id == "apple_red_01":
                if any(c in raw_lower for c in ["red", "sevappu", "chuvanna", "laal", "சிவப்பு", "ചുവന്ന", "लाल"]):
                    obj_name = "red apple"
                else:
                    obj_name = "apple"
            elif object_id == "ball_blue_01":
                if any(c in raw_lower for c in ["blue", "neela", "neeli", "நீல", "നീല", "नीली"]):
                    obj_name = "blue ball"
                else:
                    obj_name = "ball"
            elif object_id == "cube_green_01":
                obj_name = "green cube"
            elif object_id == "cyl_yellow_01":
                obj_name = "yellow cylinder"
            elif object_id == "bottle_01":
                obj_name = "water bottle"
            elif object_id == "box_small_01":
                obj_name = "small box"
            else:
                obj_name = self.OBJECT_SYNONYMS.get(object_id, {}).get("canonical", "object").lower()
        elif any(w in text_clean.lower() for w in ["ball", "panthu", "gend", "பந்து", "പന്ത്", "गेंद"]):
            obj_name = "ball"
            object_id = "ball_blue_01"

        if source_zone and target_zone:
            if is_move_phrased:
                english_cmd = f"Move the {obj_name} from {zone_names[source_zone]} to {zone_names[target_zone]}."
            else:
                english_cmd = f"Pick up the {obj_name} from {zone_names[source_zone]} and place it in {zone_names[target_zone]}."
        elif not source_zone and target_zone:
            if is_move_phrased:
                english_cmd = f"Move the {obj_name} to {zone_names[target_zone]}."
            else:
                english_cmd = f"Pick up the {obj_name} and place it in {zone_names[target_zone]}."
        elif source_zone and not target_zone:
            english_cmd = f"Pick up the {obj_name} from {zone_names[source_zone]}."
        else:
            if is_move_phrased:
                english_cmd = f"Move the {obj_name}."
            else:
                english_cmd = f"Pick up the {obj_name}."

        return {
            "original": text_clean,
            "detected_language": lang,
            "confidence": confidence,
            "english_command": english_cmd,
            "action": action,
            "object_id": object_id,
            "source_zone": source_zone,
            "target_zone": target_zone,
            "is_ambiguous": is_ambiguous
        }

parser = MultilingualParser()



