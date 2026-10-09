import importlib
import sys

import report_rules


def test_uppercase_names_in_a_local_module_override_the_defaults(tmp_path, monkeypatch):
    (tmp_path / "report_rules_local.py").write_text(
        "FISCAL_START_MONTH = 1\nlowercase_is_ignored = 'x'\nNOT_A_RULE = 5\n"
    )
    monkeypatch.syspath_prepend(str(tmp_path))
    sys.modules.pop("report_rules_local", None)
    try:
        reloaded = importlib.reload(report_rules)
        assert reloaded.FISCAL_START_MONTH == 1
        assert not hasattr(reloaded, "lowercase_is_ignored")
        assert not hasattr(reloaded, "NOT_A_RULE")
    finally:
        # The local module must be unreachable before the restoring reload,
        # otherwise the override is simply applied again.
        sys.path.remove(str(tmp_path))
        sys.modules.pop("report_rules_local", None)
        importlib.reload(report_rules)
        assert report_rules.FISCAL_START_MONTH == 9
