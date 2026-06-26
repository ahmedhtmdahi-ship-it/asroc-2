<?php

return [
    /*
     * Path to the Firebase service account JSON credentials file.
     * Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key
     * Place the file at storage/app/firebase-credentials.json (or set the path below).
     */
    'credentials' => env('FIREBASE_CREDENTIALS', storage_path('app/firebase-credentials.json')),
];
