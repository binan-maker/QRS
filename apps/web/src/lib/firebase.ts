"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { publicEnv } from "@/lib/env";

const config = {
  apiKey: publicEnv.firebase.apiKey,
  authDomain: publicEnv.firebase.authDomain,
  projectId: publicEnv.firebase.projectId,
  storageBucket: publicEnv.firebase.storageBucket,
  messagingSenderId: publicEnv.firebase.messagingSenderId,
  appId: publicEnv.firebase.appId,
};

export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(config);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export function isFirebaseConfigured() {
  return Boolean(config.apiKey && config.projectId && config.appId);
}