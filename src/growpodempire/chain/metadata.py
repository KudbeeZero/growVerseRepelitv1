"""
ARC-3 NFT metadata builders for strains and harvests.

Produces the JSON document an NFT's `url` (with the `#arc3` suffix) points at,
plus a 32-byte metadata hash for on-chain integrity.
"""

import hashlib
import json
from typing import Dict


def metadata_hash(metadata: Dict) -> bytes:
    """SHA-256 of the canonical metadata JSON (32 bytes for the ASA field)."""
    canonical = json.dumps(metadata, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(canonical).digest()


def strain_metadata(strain) -> Dict:
    """ARC-3 metadata for a (stabilized, rare) strain NFT."""
    return {
        "name": strain.name,
        "description": f"GrowPodEmpire genetics — {strain.rarity} strain, "
        f"generation {strain.generation}.",
        "decimals": 0,
        "properties": {
            "type": "strain",
            "rarity": strain.rarity,
            "lineage_type": strain.lineage_type,
            "indica_ratio": strain.indica_ratio,
            "thc_range": [strain.thc_min, strain.thc_max],
            "cbd_range": [strain.cbd_min, strain.cbd_max],
            "flowering_days": [strain.flowering_days_min, strain.flowering_days_max],
            "stability": strain.stability,
            "generation": strain.generation,
            "terpenes": strain.terpenes,
        },
    }


def diploma_metadata(degree_key: str, degree: Dict, player) -> Dict:
    """ARC-3 metadata for a GrowPod University diploma — a verifiable academic
    credential mirrored on-chain. The DB remains authoritative for the perks and
    title the degree grants; this credential just proves the degree was earned."""
    perks = degree.get("perks") or {}
    return {
        "name": degree.get("name", degree_key),
        "description": (
            f"GrowPod University diploma — {degree.get('name', degree_key)}. "
            f"Conferred the title \"{degree.get('title', '')}\". "
            "A verifiable academic credential earned in GROWv2."
        ),
        "decimals": 0,
        "properties": {
            "type": "diploma",
            "degree_key": degree_key,
            "tier": degree.get("tier"),
            "title": degree.get("title"),
            "required_courses": list(degree.get("required_courses") or []),
            "perks": dict(perks),
            "graduate": getattr(player, "name", None) or getattr(player, "id", None),
        },
    }


def harvest_metadata(harvest, strain) -> Dict:
    """ARC-3 metadata for a premium harvest NFT."""
    return {
        "name": f"{strain.name} Harvest",
        "description": f"GrowPodEmpire harvest — {harvest.weight_g}g of "
        f"{strain.name} at quality {round(harvest.quality, 1)}.",
        "decimals": 0,
        "properties": {
            "type": "harvest",
            "strain": strain.name,
            "rarity": harvest.rarity_snapshot,
            "weight_g": harvest.weight_g,
            "quality": harvest.quality,
            "thc": harvest.thc_actual,
            "cbd": harvest.cbd_actual,
            "harvested_at": harvest.harvested_at.isoformat()
            if harvest.harvested_at
            else None,
        },
    }
