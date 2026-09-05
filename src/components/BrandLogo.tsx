/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User } from "lucide-react";

interface BrandLogoProps {
  logoUrl?: string;
  alt?: string;
  className?: string;
  iconClassName?: string;
  containerClassName?: string;
}

export default function BrandLogo({
  logoUrl,
  alt = "Brand Logo",
  className = "w-10 h-10 object-cover rounded-xl border border-amber-400/30 shadow-md",
  iconClassName = "w-5 h-5 text-emerald-400",
  containerClassName
}: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Reset error status whenever logoUrl changes
  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  if (logoUrl && !imageError) {
    return (
      <img
        src={logoUrl}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className={className}
      />
    );
  }

  // Fallback profile icon badge when no logo is available or if image fails to load
  return (
    <div
      className={
        containerClassName ||
        `flex items-center justify-center shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 border border-emerald-500/30 rounded-xl shadow-md ${className.replace(
          /object-\w+/g,
          ""
        )}`
      }
      title={`${alt} (Profile Icon Fallback)`}
    >
      <User className={iconClassName} />
    </div>
  );
}
