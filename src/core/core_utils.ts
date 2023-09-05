// Copyright (c) 2023 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.
import { variations as proto } from '../proto/generated/proto_bundle';

export interface ProcessingOptions {
  minMajorVersion: number;
  isBraveSeed: boolean;
}

export const variationsProductionUrl = 'https://variations.brave.com/seed';
export const variationsStagingUrl = 'https://variations.bravesoftware.com/seed';

export const kGetUsedChromiumVersion =
  'https://versions.brave.com/latest/release-windows-x64-chromium.version';

export function getChromiumFeatureUrl(feature: string): string {
  return `https://source.chromium.org/search?q="BASE_DECLARE_FEATURE(k${feature})"&sq=&ss=chromium%2Fchromium%2Fsrc`;
}

export function getChannelNameFromString(
  protoChannel: string,
  isBraveSpecific: boolean,
): string {
  if (isBraveSpecific) {
    if (protoChannel === 'STABLE') return 'RELEASE';
    if (protoChannel === 'CANARY') return 'NIGHTLY';
  }
  return protoChannel;
}

export function getChannelName(
  protoChannel: proto.Study.Channel,
  isBraveSpecific: boolean,
): string {
  return getChannelNameFromString(
    proto.Study.Channel[protoChannel],
    isBraveSpecific,
  );
}

export function getPlatformNameFromString(protoPlatfrom: string): string {
  const PREFIX = 'PLATFORM_';
  if (protoPlatfrom.startsWith(PREFIX))
    return protoPlatfrom.substring(PREFIX.length);
  return protoPlatfrom;
}

export function getPlatfromName(protoPlatfrom: proto.Study.Platform): string {
  return getPlatformNameFromString(proto.Study.Platform[protoPlatfrom]);
}
