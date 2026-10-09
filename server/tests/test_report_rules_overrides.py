import importlib
import sys

import pytest

import report_rules


@pytest.fixture
def local_rules(tmp_path, monkeypatch):
    """Reload report_rules against a report_rules_local.py written for the test.

    The returned callable takes the local file's source. Teardown makes that
    file unreachable again, puts back whatever previously answered to the
    module name, and reloads so the defaults are restored for later tests.
    """
    previous = sys.modules.pop("report_rules_local", None)
    original = report_rules.FISCAL_START_MONTH
    monkeypatch.syspath_prepend(str(tmp_path))

    def load(source):
        (tmp_path / "report_rules_local.py").write_text(source)
        sys.modules.pop("report_rules_local", None)
        return importlib.reload(report_rules)

    yield load
    # The local module must be unreachable before the restoring reload,
    # otherwise the override is simply applied again.
    sys.path.remove(str(tmp_path))
    sys.modules.pop("report_rules_local", None)
    if previous is not None:
        sys.modules["report_rules_local"] = previous
    importlib.reload(report_rules)
    assert report_rules.FISCAL_START_MONTH == original


def test_uppercase_names_in_a_local_module_override_the_defaults(local_rules):
    reloaded = local_rules("FISCAL_START_MONTH = 1\nlowercase_is_ignored = 'x'\n")
    assert reloaded.FISCAL_START_MONTH == 1
    assert not hasattr(reloaded, "lowercase_is_ignored")


def test_an_unknown_uppercase_name_warns_and_is_not_added(local_rules):
    with pytest.warns(UserWarning, match="NOT_A_RULE"):
        reloaded = local_rules("NOT_A_RULE = 5\n")
    assert not hasattr(reloaded, "NOT_A_RULE")


def test_editable_device_fields_follow_an_overridden_udf_name(local_rules):
    reloaded = local_rules("UDF_DEPARTMENT = 'Dept'\n")
    assert "Dept" in reloaded.EDITABLE_DEVICE_FIELDS
    assert "Department" not in reloaded.EDITABLE_DEVICE_FIELDS


def test_an_import_error_inside_the_local_file_propagates(local_rules):
    with pytest.raises(ModuleNotFoundError, match="nowhere_at_all"):
        local_rules("from nowhere_at_all import x\n")
