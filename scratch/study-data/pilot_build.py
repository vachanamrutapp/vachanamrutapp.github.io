"""Pilot data for study mode: summaries + quizzes for Vachanamruts 5, 18, 78, 201 (gu + en).

Each question is written once per language as (question, correct, [3 wrong], why) and shares one
answer position `a`, so the Gujarati and English quizzes always agree on the correct option.
Output: www/assets/data/study/{summary,quiz}-{gu,en}.json
"""
import json, os

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'www', 'assets', 'data', 'study')

# id -> { themes, en/gu: (key, summary), qs: [ (a, en_tuple, gu_tuple) ] }
DATA = {}

DATA[5] = dict(
    themes=['upasana', 'sadhana'],
    en=("Never give up meditation, even when you cannot see God's form: persistence wins His grace.",
        "Shriji Maharaj instructs that one should meditate on Shri Krishna Bhagwan together with Radhika. Even if the divine form cannot be seen within the heart, one must never give up meditation out of faint-heartedness. Upon those who persist like this, God showers immense grace, and through their bhakti He becomes bound to them."),
    gu=("મૂર્તિ ન દેખાય તોપણ ધ્યાન ન છોડવું: આગ્રહથી ભગવાનની કૃપા થાય છે.",
        "શ્રીજીમહારાજ આજ્ઞા કરે છે કે રાધિકાજી સહિત શ્રીકૃષ્ણ ભગવાનનું ધ્યાન કરવું. ધ્યાનમાં હૃદયમાં મૂર્તિ ન દેખાય તોપણ કાયર થઈને ધ્યાન મૂકી દેવું નહીં. આવા આગ્રહવાળા ભક્ત પર ભગવાનની મોટી કૃપા થાય છે અને તેની ભક્તિથી ભગવાન તેને વશ થઈ જાય છે."),
    qs=[
        (2,
         ("Whose meditation did Shriji Maharaj instruct here?", "Shri Krishna with Radhika", ["Shri Ram with Sita", "Lakshmi and Narayan", "Shiva and Parvati"], "He said to meditate on Shri Krishna Bhagwan together with Radhika."),
         ("શ્રીજીમહારાજે અહીં કોનું ધ્યાન કરવાનું કહ્યું?", "રાધિકાજી સહિત શ્રીકૃષ્ણ ભગવાનનું", ["સીતાજી સહિત શ્રીરામનું", "લક્ષ્મીજી સહિત નારાયણનું", "પાર્વતીજી સહિત શિવનું"], "શ્રીજીમહારાજે રાધિકાજી સહિત શ્રીકૃષ્ણ ભગવાનનું ધ્યાન કરવાનું કહ્યું.")),
        (0,
         ("What should one do if the form is not seen in the heart during meditation?", "Keep meditating regardless", ["Stop and try again later", "Switch to another deity", "Wait for a vision first"], "Even without seeing the form, one should continue to meditate."),
         ("ધ્યાન કરતાં હૃદયમાં મૂર્તિ ન દેખાય તો શું કરવું?", "તોપણ ધ્યાન કરવું", ["ધ્યાન બંધ કરી દેવું", "બીજા દેવનું ધ્યાન કરવું", "દર્શન થાય પછી જ બેસવું"], "મૂર્તિ ન દેખાય તોપણ ધ્યાન કરવાનું છે.")),
        (3,
         ("What must one never do, according to Shriji Maharaj?", "Give up meditation out of faint-heartedness", ["Meditate without a teacher", "Meditate before dawn", "Meditate in company"], "He said not to become faint-hearted and abandon the meditation."),
         ("શ્રીજીમહારાજના કહ્યા પ્રમાણે શું ન કરવું?", "કાયર થઈને ધ્યાન મૂકી દેવું", ["ગુરુ વિના ધ્યાન કરવું", "વહેલી સવારે ધ્યાન કરવું", "સૌની સાથે બેસીને ધ્યાન કરવું"], "કાયર થઈને ધ્યાન મૂકી દેવું નહીં, એમ તેમણે કહ્યું.")),
        (1,
         ("How does God respond to those who persist like this?", "Showers great grace on them", ["Tests them harder", "Keeps them waiting", "Ignores their effort"], "Such persistent devotees receive the immense grace of God."),
         ("આવા આગ્રહવાળા ભક્ત પર ભગવાન શું કરે છે?", "તેના પર મોટી કૃપા કરે છે", ["વધુ કસોટી કરે છે", "રાહ જોવડાવે છે", "તેના પ્રયત્નને ગણતા નથી"], "આવા આગ્રહવાળા ભક્ત પર ભગવાનની મોટી કૃપા થાય છે.")),
        (2,
         ("What happens through such devotees' bhakti?", "God becomes bound to them", ["They become equal to God", "They gain worldly wealth", "They need no more bhakti"], "Through their bhakti, God comes under their control."),
         ("આવા ભક્તની ભક્તિથી શું થાય છે?", "ભગવાન તેને વશ થઈ જાય છે", ["તે ભગવાન સમાન થઈ જાય છે", "તેને ધન-સંપત્તિ મળે છે", "હવે ભક્તિ કરવી પડતી નથી"], "તેની ભક્તિથી ભગવાન તેને વશ થઈ જાય છે.")),
        (0,
         ("What does this teach about meditation?", "Steady effort matters more than seeing results", ["Seeing the form is required", "Only experts should meditate", "A short meditation is enough"], "Persistence, not the experience of seeing the form, wins God's grace."),
         ("આ વચનામૃત ધ્યાન વિશે શું શીખવે છે?", "દર્શન ન થાય તોપણ દૃઢ આગ્રહ રાખવો", ["મૂર્તિ દેખાય તો જ ધ્યાન કરવું", "ફક્ત જાણકારે જ ધ્યાન કરવું", "થોડું ધ્યાન પૂરતું છે"], "ફળ દેખાય કે ન દેખાય, આગ્રહ રાખવાથી ભગવાન રાજી થાય છે.")),
        (3,
         ("Which quality does Maharaj praise in this talk?", "Firm persistence", ["Quick results", "Great learning", "Generous charity"], "He praises those who are firm in their persistence."),
         ("શ્રીજીમહારાજ અહીં કયા ગુણની પ્રશંસા કરે છે?", "દૃઢ આગ્રહ", ["ઝડપી પરિણામ", "મોટું જ્ઞાન", "દાન"], "તેઓ આગ્રહવાળા ભક્તની મહિમા કહે છે.")),
        (1,
         ("On which date was this discourse given?", "Magshar sudi 8, Samvat 1876", ["Magshar vadi 6, Samvat 1876", "Kartik sudi 11, Samvat 1882", "Ashadh sudi 3, Samvat 1877"], "It was given on Magshar sudi 8, Samvat 1876 (25 November 1819)."),
         ("આ વચનામૃત કઈ તિથિએ થયું?", "સંવત ૧૮૭૬, માગશર સુદિ ૮", ["સંવત ૧૮૭૬, માગશર વદિ ૬", "સંવત ૧૮૮૨, કારતક સુદિ ૧૧", "સંવત ૧૮૭૭, અષાઢ સુદિ ૩"], "તે સંવત ૧૮૭૬ના માગશર સુદિ ૮ ને દિવસે થયું.")),
        (2,
         ("Where was Shriji Maharaj sitting?", "Dada Khachar's darbar, Gadhada", ["Jiva Khachar's darbar, Sarangpur", "Lakshminarayan mandir, Vartal", "Sura Khachar's darbar, Loya"], "He was in Dada Khachar's darbar in Gadhada."),
         ("શ્રીજીમહારાજ ક્યાં વિરાજમાન હતા?", "ગઢડામાં દાદાખાચરના દરબારમાં", ["સારંગપુરમાં જીવાખાચરના દરબારમાં", "વરતાલમાં લક્ષ્મીનારાયણના મંદિરમાં", "લોયામાં સૂરાખાચરના દરબારમાં"], "તેઓ ગઢડામાં દાદાખાચરના દરબારમાં વિરાજમાન હતા.")),
        (3,
         ("What was Shriji Maharaj wearing?", "All white clothes", ["Plain saffron clothes", "A red silk jama", "A deerskin"], "He was dressed entirely in white."),
         ("શ્રીજીમહારાજે કેવાં વસ્ત્ર ધારણ કર્યાં હતાં?", "સર્વ શ્વેત વસ્ત્ર", ["ભગવાં વસ્ત્ર", "લાલ રેશમી જામો", "મૃગચર્મ"], "તેમણે સર્વ શ્વેત વસ્ત્ર ધારણ કર્યાં હતાં.")),
    ],
)

DATA[18] = dict(
    themes=['sadhana', 'sant'],
    en=("Keep the vishays of the five indriyas pure and keep good company: this, not the antahkaran, decides whether God stays in mind.",
        "Shriji Maharaj reveals that what disturbs a devotee's worship is not the antahkaran but impure vishays entering through the five indriyas, which intoxicate the mind like bhang. By keeping those inputs pure and keeping the company of God and His Sant, the mind stays clear and God stays remembered. Maharaj also lovingly warns that none should imitate Him: He is eternally liberated, and all He accepts from devotees is only for their good."),
    gu=("પંચ ઇન્દ્રિયોના વિષય શુદ્ધ રાખો ને સારો સંગ કરો: એથી જ ભગવાનની સ્મૃતિ અખંડ રહે.",
        "શ્રીજીમહારાજ જણાવે છે કે ભક્તના ભજનમાં વિક્ષેપનું કારણ અંતઃકરણ નથી, પણ પંચ ઇન્દ્રિયો દ્વારા આવતા અશુદ્ધ વિષયો છે, જે ભાંગની જેમ બુદ્ધિને ભ્રષ્ટ કરે છે. આહાર શુદ્ધ રાખવાથી અને ભગવાન તથા સંતનો સંગ કરવાથી અંતઃકરણ નિર્મળ રહે છે ને ભગવાનની સ્મૃતિ અખંડ રહે છે. સાથે શ્રીજીમહારાજ કરુણાથી ચેતવે છે કે કોઈએ તેમનો વાદ ન લેવો, કેમ કે તેઓ અનાદિ મુક્ત છે અને ભક્તો પાસેથી જે અંગીકાર કરે છે તે તેમના જીવના કલ્યાણ માટે જ છે."),
    qs=[
        (1,
         ("What does Maharaj name as the main cause of disturbance in a devotee's worship?", "The vishays of the five indriyas", ["The antahkaran itself", "Lack of scriptural study", "A bad place to live"], "The antahkaran is not the cause; the vishays of the five indriyas are."),
         ("ભક્તના ભજનમાં વિક્ષેપનું મુખ્ય કારણ શ્રીજીમહારાજે કયું કહ્યું?", "પંચ ઇન્દ્રિયોના વિષય", ["અંતઃકરણ પોતે", "શાસ્ત્રનું ઓછું ભણતર", "રહેવાનું ખરાબ સ્થાન"], "કારણ અંતઃકરણ નથી, પંચ ઇન્દ્રિયોના વિષય છે.")),
        (3,
         ("What is the only fault of the antahkaran, according to Maharaj?", "Complacency that nothing is left to do", ["Anger toward others", "Too much renunciation", "Eagerness for darshan"], "It feels, 'I have found God, so nothing is left to do.'"),
         ("શ્રીજીમહારાજના કહેવા પ્રમાણે અંતઃકરણનો એકમાત્ર વાંક શો?", "‘હવે કાંઈ કરવું રહ્યું નથી’ એવી ગાફલતા", ["બીજા પર ક્રોધ", "અતિશય ત્યાગ", "દર્શનની અધીરાઈ"], "‘ભગવાન મળ્યા, હવે કાંઈ કરવું રહ્યું નથી’ એવી ગાફલતા રહે છે.")),
        (0,
         ("To what does Maharaj compare impure food, sounds, touch, sights and smells?", "Drinking bhang or alcohol", ["A passing fever", "Heavy rain", "A deep sleep"], "Their intoxicating effect makes one forget worship and religious vows."),
         ("અશુદ્ધ આહાર, શબ્દ, સ્પર્શ, રૂપ અને ગંધને શ્રીજીમહારાજે શાની સાથે સરખાવ્યા?", "ભાંગ કે દારૂ પીવા સાથે", ["ક્ષણિક તાવ સાથે", "મોટા વરસાદ સાથે", "ગાઢ નિદ્રા સાથે"], "તેના કેફથી ભજન અને વર્તમાનની ખબર રહેતી નથી.")),
        (2,
         ("If one cannot touch a great Sant, what purifies the mind?", "Dust of his feet on one's head", ["Fasting for a day", "Bathing in a river", "Chanting silently"], "Placing the dust of his feet on the head purifies one."),
         ("મોટા સંતનો સ્પર્શ ન થાય તો શાથી પવિત્ર થવાય?", "તેના ચરણની રજ માથે ચડાવવાથી", ["એક દિવસ ઉપવાસ કરવાથી", "નદીમાં સ્નાન કરવાથી", "મૌનથી જપ કરવાથી"], "ચરણની રજ માથે ચડાવવાથી પવિત્ર થવાય છે.")),
        (1,
         ("What follows if the five indriyas take in only pure vishays?", "The mind turns pure and remembers God", ["Worship becomes unnecessary", "All work comes to an end", "All desires vanish at once"], "A pure antahkaran keeps God constantly in remembrance."),
         ("પંચ ઇન્દ્રિયોનો આહાર શુદ્ધ હોય તો શું થાય?", "અંતઃકરણ શુદ્ધ થઈ ભગવાનની સ્મૃતિ રહે", ["ભજનની જરૂર રહેતી નથી", "કામકાજ બંધ થઈ જાય", "બધી ઇચ્છાઓ એકદમ મટી જાય"], "શુદ્ધ અંતઃકરણથી અખંડ ભગવાનની સ્મૃતિ રહે છે.")),
        (3,
         ("What happens if even one indriya's vishays are impure?", "The whole antahkaran becomes impure", ["Only that indriya suffers", "Nothing, if the rest are pure", "Only the body is affected"], "One impure input is enough to pollute the antahkaran."),
         ("એક પણ ઇન્દ્રિયનો આહાર મલિન હોય તો શું થાય?", "આખું અંતઃકરણ મલિન થઈ જાય", ["ફક્ત તે ઇન્દ્રિયને નુકસાન થાય", "બાકી શુદ્ધ હોય તો કાંઈ ન થાય", "ફક્ત શરીરને અસર થાય"], "એક ઇન્દ્રિયનો આહાર મલિન થાય તો અંતઃકરણ પણ મલિન થાય છે.")),
        (0,
         ("How should one who stays evil even after joining Satsang be treated?", "Removed, like a snake-bitten finger", ["Honoured as a guest", "Given a post of service", "Ignored but kept close"], "Like cutting off a snake-bitten finger to save the body, he should be removed."),
         ("સત્સંગમાં આવ્યા પછી પણ કુપાત્રપણું રાખે તેનું શું કરવું?", "સર્પદંશવાળી આંગળીની જેમ બહાર કાઢવો", ["અતિથિની જેમ સન્માન કરવું", "સેવામાં મોટું પદ આપવું", "અવગણીને પાસે રાખવો"], "સર્પે કરડેલી આંગળી કાપી નાંખીએ તેમ તેનો ત્યાગ કરવો.")),
        (2,
         ("Which two assemblies does Maharaj contrast to show the effect of company?", "Revelers' haveli versus paramhansas' hut", ["A fair versus a temple festival", "A royal court versus a school", "A city versus a forest"], "One spoils the mind; the other uplifts it."),
         ("સંગની અસર બતાવવા શ્રીજીમહારાજે કઈ બે સભાઓ સરખાવી?", "વિષયીઓની હવેલી અને પરમહંસોની ઝૂંપડી", ["મેળો અને મંદિરનો ઉત્સવ", "રાજદરબાર અને નિશાળ", "શહેર અને જંગલ"], "એકથી અંતઃકરણ બગડે છે, બીજીથી સુધરે છે.")),
        (0,
         ("Why does Maharaj say none should imitate Him?", "He is eternally liberated and masters His antahkaran", ["He avoids all people", "He owns nothing", "He never faces temptations"], "He holds His antahkaran as a lion seizes a goat; others cannot."),
         ("શ્રીજીમહારાજ કોઈએ તેમનો વાદ કેમ ન લેવો એમ કહે છે?", "તેઓ અનાદિ મુક્ત ને અંતઃકરણને વશ રાખનારા", ["તેઓ સર્વથી દૂર રહે છે", "તેમની પાસે કશું નથી", "તેમને કદી લાલચ આવતી નથી"], "સિંહ બકરાને પકડે તેમ તેઓ અંતઃકરણને પકડે છે; બીજાથી એમ થાય નહીં.")),
        (1,
         ("At what time was this discourse given?", "Late night, before dawn", ["At noon", "At sunset", "Mid-morning"], "It was given about three hours before sunrise."),
         ("આ વચનામૃત દિવસના કયા સમયે થયું?", "રાત્રિનો પાછલો પહોર બાકી હતો ત્યારે", ["બપોરે", "સાંજે", "સવારે મોડું"], "સૂર્યોદયને ત્રણેક કલાકની વાર હતી ત્યારે થયું.")),
    ],
)

DATA[78] = dict(
    themes=['sant', 'upasana', 'sadhana'],
    en=("Do not depend on past karma: shun bad influences, keep the company of God and His devotee, and understand God's glory.",
        "Shriji Maharaj shows that past karma does not rule over place, time, company and the other factors; one who seeks liberation must shun the bad and keep the good, above all the company of God and His devotees in mind, deed and speech. Answering the young sadhus' questions in the afternoon, He explains that firm nishchay sees every act of God as beneficial, and that understanding God's glory, keeping the five vartmans and obeying the Sant keep one steady."),
    gu=("પૂર્વકર્મ પર આધાર ન રાખો: ભૂંડા સંગનો ત્યાગ કરો, ભગવાન ને તેમના ભક્તનો સંગ કરો, ને માહાત્મ્ય સમજો.",
        "શ્રીજીમહારાજ સમજાવે છે કે દેશ, કાળ, સંગ આદિ આઠમાં પૂર્વકર્મ પ્રધાન નથી; કલ્યાણ ઇચ્છનારે ભૂંડાંનો ત્યાગ કરી રૂડાંનું સેવન કરવું, અને ખાસ કરીને મન, કર્મ, વચને ભગવાન તથા તેમના ભક્તનો સંગ કરવો. પછી બપોરે નાના સાધુઓના પ્રશ્નોના ઉત્તરમાં કહે છે કે અચળ નિશ્ચયવાળાને ભગવાનની સર્વ ક્રિયા કલ્યાણકારી લાગે છે, અને ભગવાનનું માહાત્મ્ય સમજવાથી, પંચ વર્તમાન દૃઢ રાખવાથી અને સંતના કહ્યા પ્રમાણે વર્તવાથી ભક્તિ અચળ રહે છે."),
    qs=[
        (2,
         ("Which pair is among the eight factors Maharaj lists?", "Company and scripture", ["Birth and caste", "Wealth and fame", "Health and age"], "The eight: place, time, action, company, mantra, meditation of the deity, initiation and scripture."),
         ("શ્રીજીમહારાજે ગણાવેલા આઠમાંથી કઈ જોડી તેમાં આવે?", "સંગ અને શાસ્ત્ર", ["જન્મ અને જાતિ", "ધન અને કીર્તિ", "આરોગ્ય અને ઉંમર"], "આઠ: દેશ, કાળ, ક્રિયા, સંગ, મંત્ર, દેવતાનું ધ્યાન, દીક્ષા અને શાસ્ત્ર.")),
        (0,
         ("Which scriptures, says Maharaj, make karma alone supreme?", "The Jain scriptures", ["The Vedas", "The Puranas", "The Shrimad Bhagwat"], "Other scriptures stress the company of God and His devotee."),
         ("કર્મનું એકલું જ પ્રધાનપણું કયાં શાસ્ત્રમાં છે, એમ શ્રીજીમહારાજ કહે છે?", "જૈનનાં શાસ્ત્રમાં", ["વેદમાં", "પુરાણમાં", "શ્રીમદ્‌ ભાગવતમાં"], "બીજાં શાસ્ત્રમાં તો ભગવાન ને તેમના ભક્તના સંગનું પ્રધાનપણું છે.")),
        (3,
         ("What example shows that place does not change with past karma?", "Deep water in Marwar", ["Floods in Saurashtra", "The course of the Ganga", "Monsoon rain in Gujarat"], "Marwar has deep water whether its people are virtuous or sinful."),
         ("દેશ પૂર્વકર્મથી ફરતો નથી, તે બતાવવા કયું દૃષ્ટાંત આપ્યું?", "મારવાડનાં ઊંડાં પાણી", ["સૌરાષ્ટ્રના પૂર", "ગંગાનો પ્રવાહ", "ગુજરાતનો વરસાદ"], "મારવાડમાં પાપી હોય કે પુણ્યવાળો, પાણી ઊંડાં જ રહે છે.")),
        (1,
         ("What should a seeker of liberation do with the eight?", "Shun the bad ones and follow the good", ["Rely on past karma", "Treat all eight alike", "Avoid thinking about them"], "He should give up the bad and follow the good."),
         ("કલ્યાણ ઇચ્છનારે એ આઠનું શું કરવું?", "ભૂંડાંનો ત્યાગ કરી રૂડાંનું સેવન કરવું", ["પૂર્વકર્મ પર આધાર રાખવો", "આઠેને સરખાં ગણવાં", "તેનો વિચાર ન કરવો"], "ભૂંડાં આઠનો ત્યાગ કરી રૂડાં આઠનું સેવન કરવું.")),
        (2,
         ("What does Maharaj call true company?", "Union in mind, deed and speech", ["Sitting beside someone", "Greeting someone warmly", "Eating together daily"], "Only company in mind, deed and speech counts, and that should be with God and His devotee."),
         ("શ્રીજીમહારાજ સાચો સંગ કોને કહે છે?", "મન, કર્મ, વચને કરેલો સંગ", ["પાસે બેસવું તે", "પ્રેમથી મળવું તે", "રોજ સાથે જમવું તે"], "મન, કર્મ, વચને થયેલો સંગ જ સંગ છે, ને તે ભગવાન ને તેમના ભક્તનો કરવો.")),
        (0,
         ("How is a firm nishchay in God recognised?", "All of God's actions seem beneficial", ["He often dreams of God", "He never feels sorrow", "He recites scripture daily"], "Whatever God does, such a devotee says it is for his liberation."),
         ("ભગવાનનો અચળ નિશ્ચય કેમ ઓળખાય?", "ભગવાનની સર્વ ક્રિયા કલ્યાણકારી લાગે", ["ભગવાન વારંવાર સ્વપ્નમાં દેખાય", "કદી શોક ન થાય", "રોજ શાસ્ત્રનો પાઠ થાય"], "ભગવાન ગમે તે કરે, તે સર્વ કલ્યાણને અર્થે છે એમ તે કહે છે.")),
        (3,
         ("What shows a firm footing in Satsang?", "Cannot bear criticism of Satsang", ["Stays silent when it is criticised", "Avoids all debate", "Visits many assemblies"], "He feels it as he would if his own family were criticised."),
         ("સત્સંગમાં અચળ પાયો કેમ જણાય?", "સત્સંગનું ઘસાતું સાંભળી ન શકે", ["ઘસાતું બોલાય ત્યારે ચૂપ રહે", "બધા વાદવિવાદથી દૂર રહે", "ઘણી સભાઓમાં જાય"], "પોતાના કુટુંબીનું ઘસાતું ન ખમાય તેમ સત્સંગનું ન ખમાય.")),
        (1,
         ("Why does asadvasana remain despite faith in God?", "God's glory is not truly understood", ["Too little reading", "Too little fasting", "Too much company"], "Without understanding God's glory, bad desires do not leave."),
         ("ભગવાનનો નિશ્ચય હોવા છતાં અસદ્‌વાસના કેમ ટળતી નથી?", "ભગવાનનું માહાત્મ્ય યથાર્થ જાણ્યું નથી", ["ભણતર ઓછું છે", "ઉપવાસ ઓછા થાય છે", "સંગ વધુ છે"], "માહાત્મ્ય યથાર્થ ન જાણ્યું હોય ત્યાં સુધી અસદ્‌વાસના ટળતી નથી.")),
        (0,
         ("What is the way out when place, time and company are adverse?", "Flee from there by any means", ["Stay and endure it", "Wait for it to change", "Argue with them"], "The only way to be saved is to escape from such surroundings."),
         ("દેશ, કાળ, સંગ વિષમ હોય ત્યારે ઉપાય શો?", "ત્યાંથી ભાગી છૂટવું", ["ત્યાં રહી સહન કરવું", "બદલાય તેની રાહ જોવી", "તેમની સાથે વાદ કરવો"], "ઊગરવાનો એ જ ઉપાય છે કે ત્યાંથી ભાગી છૂટવું.")),
        (2,
         ("How many sadhus did Maharaj bless by placing His feet on their hearts?", "Four", ["Two", "Seven", "Twelve"], "He did so for Atmanand, Yoganand, Bhagvadanand and Shivanand."),
         ("શ્રીજીમહારાજે કેટલા સંતોના હૃદયમાં ચરણારવિંદ દીધાં?", "ચાર", ["બે", "સાત", "બાર"], "આત્માનંદ, યોગાનંદ, ભગવદાનંદ અને શિવાનંદ સ્વામીને.")),
    ],
)

DATA[201] = dict(
    themes=['atma', 'manan', 'upasana'],
    en=("Firm conviction in the manifest God is itself nirvikalp samadhi; wage war on the mind, for the effort is never lost.",
        "Shriji Maharaj explains that nirvikalp samadhi does not depend on stilling the prans: one who has an unshakable conviction in the manifest form of Shri Krishna Bhagwan, free of doubts, is in constant nirvikalp samadhi. He then urges the aspirant to wage a firm war against the mind, for even one who is defeated will, in this life or later ones, become an ekantik bhakta, and the effort is never wasted."),
    gu=("પ્રત્યક્ષ ભગવાનનો દૃઢ નિશ્ચય એ જ નિર્વિકલ્પ સમાધિ છે; મન સાથે વૈર બાંધો, દાખડો એળે જતો નથી.",
        "શ્રીજીમહારાજ સમજાવે છે કે નિર્વિકલ્પ સમાધિ પ્રાણના નિરોધ પર આધારિત નથી: પ્રત્યક્ષ શ્રીકૃષ્ણ ભગવાનના સ્વરૂપનો જેને કોઈ કુતર્ક વિનાનો દૃઢ નિશ્ચય છે તેને સદા નિર્વિકલ્પ સમાધિ જ છે. પછી મન સાથે દૃઢ વૈર બાંધવાની પ્રેરણા કરે છે, કેમ કે મનથી હારનાર પણ એક કે ઘણા જન્મે અંતે એકાંતિક ભક્ત થાય છે અને તેનો દાખડો એળે જતો નથી."),
    qs=[
        (1,
         ("Who asked the first question?", "Shobharam Shastri of Vadodara", ["Dinanath Bhatt", "Muktanand Swami", "Gopalanand Swami"], "He asked what becomes of one who does not attain nirvikalp samadhi."),
         ("પ્રથમ પ્રશ્ન કોણે પૂછ્યો?", "વડોદરાવાળા શોભારામ શાસ્ત્રીએ", ["દીનાનાથ ભટ્ટે", "મુક્તાનંદ સ્વામીએ", "ગોપાળાનંદ સ્વામીએ"], "તેમણે પૂછ્યું કે જેને નિર્વિકલ્પ સમાધિ ન થાય તેની શી ગતિ.")),
        (3,
         ("What does Maharaj say about nirvikalp samadhi and the prans?", "Not only when the prans are stilled", ["It comes only when the prans are stilled", "It needs years in the Himalayas", "It comes only after death"], "There is another way to nirvikalp samadhi."),
         ("નિર્વિકલ્પ સમાધિ અને પ્રાણ વિશે શ્રીજીમહારાજ શું કહે છે?", "ફક્ત પ્રાણના નિરોધથી જ થાય એમ નથી", ["પ્રાણનો નિરોધ થાય ત્યારે જ થાય", "હિમાલયમાં વર્ષો રહ્યે થાય", "મૃત્યુ પછી જ થાય"], "નિર્વિકલ્પ સમાધિની રીત બીજી છે.")),
        (2,
         ("What gives a person constant nirvikalp samadhi?", "Firm conviction in God's manifest form", ["Controlling the breath", "Long fasting", "Studying the Bhagwat"], "With firm conviction, he has nirvikalp samadhi whether or not his prans are stilled."),
         ("સદા નિર્વિકલ્પ સમાધિ કોને રહે?", "જેને પ્રત્યક્ષ સ્વરૂપનો દૃઢ નિશ્ચય હોય", ["જે શ્વાસ રોકે", "જે લાંબા ઉપવાસ કરે", "જે ભાગવત ભણે"], "દૃઢ નિશ્ચયવાળાને પ્રાણ લીન થાય કે ન થાય, સમાધિ જ છે.")),
        (0,
         ("What example does Maharaj give for such firm conviction?", "Knowing a mango tree for certain", ["Recognising the sun", "Knowing one's own house", "Seeing a river"], "Once one knows it is a mango tree, no passion can make one doubt it."),
         ("એવા દૃઢ નિશ્ચય માટે કયું દૃષ્ટાંત આપ્યું?", "આંબાનું વૃક્ષ દૃઢ કરીને જાણવું", ["સૂર્યને ઓળખવો", "પોતાનું ઘર જાણવું", "નદી જોવી"], "આંબો એક વાર દૃઢ જાણ્યા પછી કામ-ક્રોધથી પણ ભ્રાંતિ થતી નથી.")),
        (3,
         ("Why is the samadhi of a doubting person still savikalp?", "He keeps doubting God's form and abodes", ["He has no teacher", "He lacks patience", "He sits too briefly"], "He wonders about Brahmapur and Vaikunth instead of resting in the God he has found."),
         ("સંશયવાળાની સમાધિ પણ સવિકલ્પ કેમ છે?", "ભગવાનના સ્વરૂપ-ધામના સંકલ્પ-વિકલ્પ મટતા નથી", ["તેને ગુરુ નથી", "તેને ધીરજ નથી", "તે બહુ ઓછું બેસે છે"], "મળેલા ભગવાનથી કૃતાર્થ ન માનતાં તે બ્રહ્મપુર, વૈકુંઠના વિકલ્પ કર્યા કરે છે.")),
        (1,
         ("Where was Shriji Maharaj seated for this discourse?", "Mango grove by Lake Gomti, Vartal", ["Dada Khachar's courtyard", "A grass hut in Sarangpur", "Inside the Vartal mandir"], "He sat on a throne in the mango grove north of the Lakshminarayan mandir."),
         ("શ્રીજીમહારાજ ક્યાં વિરાજમાન હતા?", "વરતાલમાં ગોમતીજીને કાંઠે આંબાવાડિયામાં", ["દાદાખાચરના દરબારના ફળિયામાં", "સારંગપુરમાં ઘાસની ઝૂંપડીમાં", "વરતાલના મંદિરની અંદર"], "તેઓ લક્ષ્મીનારાયણના મંદિરથી ઉત્તરે ગોમતીજીને કાંઠે આંબાવાડિયામાં સિંહાસને હતા.")),
        (0,
         ("What did Dinanath Bhatt ask about?", "The fate of one defeated by the mind", ["How to attain samadhi quickly", "Who is a true guru", "How to serve the Sant"], "He asked what becomes of one who tries but fails to conquer the mind."),
         ("દીનાનાથ ભટ્ટે શું પૂછ્યું?", "મનને ન જીતી શકે તેની શી ગતિ", ["સમાધિ જલદી કેમ થાય", "સાચા ગુરુ કોણ", "સંતની સેવા કેમ કરવી"], "તેમણે પૂછ્યું કે મનને જીતવાનો ઉપાય કરે પણ ન જીતી શકે તો શું થાય.")),
        (2,
         ("Which battle does Maharaj use as an example?", "Kurukshetra", ["Lanka", "Panipat", "Haldighati"], "Whether they won or fell, those who fought at Kurukshetra benefited."),
         ("શ્રીજીમહારાજે કયા યુદ્ધનું દૃષ્ટાંત આપ્યું?", "કુરુક્ષેત્રનું", ["લંકાનું", "પાણીપતનું", "હલદીઘાટીનું"], "જીત્યા તેમનું પણ સારું થયું ને મરાયા તેમનું પણ.")),
        (1,
         ("What becomes of one who is defeated by his mind?", "He later becomes an ekantik bhakta", ["He loses all his merit", "He is lost for ever", "He must begin from nothing"], "He falls from the path, but in time becomes ekantik and his effort is not lost."),
         ("મનથી હારનારનું શું થાય?", "અંતે તે એકાંતિક ભક્ત થાય", ["તેનું બધું પુણ્ય જતું રહે", "તે કાયમ માટે નષ્ટ થાય", "તેણે શૂન્યથી શરૂ કરવું પડે"], "તે યોગભ્રષ્ટ થાય, પણ એક કે ઘણા જન્મે એકાંતિક થાય છે ને દાખડો એળે જતો નથી.")),
        (2,
         ("What should an aspirant do toward his mind?", "Declare firm enmity against it", ["Ignore it completely", "Befriend and indulge it", "Leave it to God"], "Whoever desires liberation must certainly wage war on the mind."),
         ("મુમુક્ષુએ મન સાથે કેવો વ્યવહાર રાખવો?", "તેની સાથે દૃઢ વૈર બાંધવું", ["તેની પૂરેપૂરી અવગણના કરવી", "તેને મિત્ર બનાવી લાડ લડાવવા", "તેને ભગવાન પર છોડી દેવું"], "જે કલ્યાણ ઇચ્છે તેણે મન સાથે જરૂર વૈર બાંધવું.")),
    ],
)


def place(a, correct, wrong):
    opts = list(wrong)
    opts.insert(a, correct)
    return opts


def build():
    summary = {'en': {}, 'gu': {}}
    quiz = {'en': {}, 'gu': {}}
    for vid, d in DATA.items():
        for lang in ('en', 'gu'):
            key, text = d[lang]
            summary[lang][str(vid)] = dict(key=key, summary=text, themes=d['themes'])
            items = []
            for a, en, gu in d['qs']:
                q, correct, wrong, why = en if lang == 'en' else gu
                items.append(dict(q=q, o=place(a, correct, wrong), a=a, why=why))
            quiz[lang][str(vid)] = items
    os.makedirs(OUT, exist_ok=True)
    for kind, obj in (('summary', summary), ('quiz', quiz)):
        for lang in ('en', 'gu'):
            path = os.path.join(OUT, f'{kind}-{lang}.json')
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(obj[lang], f, ensure_ascii=False, indent=1)
    print('wrote', OUT)


if __name__ == '__main__':
    build()
