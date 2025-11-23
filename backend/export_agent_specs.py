#!/usr/bin/env python3
"""
Script to export Agent Spec definitions to JSON and YAML files.

This script creates sample agents using AgentManager and exports them
in Agent Spec format for portability and documentation.

Usage:
    python export_agent_specs.py [--output-dir OUTPUT_DIR] [--format FORMAT]

Options:
    --output-dir: Directory to save exported files (default: agent_specs)
    --format: Export format - 'json', 'yaml', or 'both' (default: both)
"""

import argparse
import sys
from pathlib import Path
from typing import Dict

from models.trial import RoleType, CaseContextConfig
from services.agent_manager import AgentManager


def create_sample_agents() -> AgentManager:
    """Create an AgentManager with sample agents for export."""
    agent_manager = AgentManager()
    
    sample_legal_context = {
        "jurisdiction": "United States",
        "legal_areas": ["Criminal Law", "Constitutional Law"]
    }
    
    sample_case_context = CaseContextConfig(
        description="Sample case: A defendant is charged with theft. The prosecution alleges the defendant stole valuable items from a store. The defense argues mistaken identity and lack of evidence.",
        additional_info={}
    )
    
    roles = [RoleType.JUDGE, RoleType.PROSECUTOR, RoleType.DEFENSE]
    
    agent_manager.create_agents(
        session_id="export_session",
        roles=roles,
        legal_context=sample_legal_context,
        case_context=sample_case_context
    )
    
    return agent_manager


def export_agents(
    agent_manager: AgentManager,
    output_dir: str = "agent_specs",
    format_type: str = "both"
) -> Dict[str, str]:
    """Export agents to JSON and/or YAML files.
    
    Args:
        agent_manager: AgentManager instance with agents created
        output_dir: Directory to save exported files
        format_type: 'json', 'yaml', or 'both'
    
    Returns:
        Dictionary mapping role names to exported file paths
    """
    exported_files = {}
    
    if format_type in ["json", "both"]:
        print(f"\n📄 Exporting agents to JSON format...")
        json_files = agent_manager.export_agent_specs_to_json(output_dir=output_dir)
        exported_files.update({f"{role}_json": path for role, path in json_files.items()})
    
    if format_type in ["yaml", "both"]:
        print(f"\n📄 Exporting agents to YAML format...")
        try:
            yaml_files = agent_manager.export_agent_specs_to_yaml(output_dir=output_dir)
            exported_files.update({f"{role}_yaml": path for role, path in yaml_files.items()})
        except ImportError as e:
            print(f"⚠️  Warning: {e}")
            print("   Skipping YAML export. Install PyYAML with: pip install pyyaml")
    
    return exported_files


def main():
    parser = argparse.ArgumentParser(
        description="Export Agent Spec definitions to JSON and YAML files"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="agent_specs",
        help="Directory to save exported files (default: agent_specs)"
    )
    parser.add_argument(
        "--format",
        type=str,
        choices=["json", "yaml", "both"],
        default="both",
        help="Export format: json, yaml, or both (default: both)"
    )
    
    args = parser.parse_args()
    
    print("🚀 Starting Agent Spec export...")
    print(f"   Output directory: {args.output_dir}")
    print(f"   Format: {args.format}")
    
    try:
        print("\n📦 Creating sample agents...")
        agent_manager = create_sample_agents()
        
        print(f"   Created {len(agent_manager.agent_spec_agents)} agents:")
        for role in agent_manager.agent_spec_agents.keys():
            print(f"     - {role}")
        
        exported_files = export_agents(
            agent_manager,
            output_dir=args.output_dir,
            format_type=args.format
        )
        
        print(f"\n✅ Export complete!")
        print(f"\n📁 Exported files:")
        for key, path in exported_files.items():
            print(f"   - {path}")
        
        print(f"\n💡 Tip: These Agent Spec files can be used in any compatible framework!")
        
    except Exception as e:
        print(f"\n❌ Error during export: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

