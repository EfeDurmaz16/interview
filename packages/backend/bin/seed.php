<?php

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/Config/Database.php';

Database::init();
$db = Database::getConnection();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$seedsPath = __DIR__ . '/../seeds/questions.json';
if (!file_exists($seedsPath)) {
    fwrite(STDERR, "Seeds file not found: {$seedsPath}\n");
    exit(1);
}

$raw = file_get_contents($seedsPath);
$questions = json_decode($raw, true);
if (!is_array($questions)) {
    fwrite(STDERR, "Invalid JSON in seeds file: {$seedsPath}\n");
    exit(1);
}

$sessionIds = [];
foreach ($questions as $q) {
    if (is_array($q) && isset($q['session_id']) && is_string($q['session_id']) && $q['session_id'] !== '') {
        $sessionIds[$q['session_id']] = true;
    }
}

if (count($sessionIds) > 0) {
    $insertSession = $db->prepare(
        "INSERT OR IGNORE INTO sessions (id, status, candidate_name, created_at) VALUES (:id, 'waiting', :candidate_name, datetime('now'))"
    );
    foreach (array_keys($sessionIds) as $sid) {
        $insertSession->execute([
            ':id' => $sid,
            ':candidate_name' => $sid === 'ses_question_bank' ? 'Question Bank' : null,
        ]);
    }
}

$insert = $db->prepare(
    "INSERT OR IGNORE INTO questions
        (id, title, description, difficulty, category, template_code, test_cases, evaluation_criteria, sort_order, session_id)
     VALUES
        (:id, :title, :description, :difficulty, :category, :template_code, :test_cases, :evaluation_criteria, :sort_order, :session_id)
     ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        difficulty = excluded.difficulty,
        category = excluded.category,
        template_code = excluded.template_code,
        test_cases = excluded.test_cases,
        evaluation_criteria = excluded.evaluation_criteria,
        sort_order = excluded.sort_order,
        session_id = excluded.session_id"
);

$seeded = 0;
foreach ($questions as $i => $q) {
    if (!is_array($q)) continue;
    $required = ['id', 'title', 'description', 'difficulty', 'category', 'template_code', 'test_cases', 'evaluation_criteria', 'session_id'];
    $missing = [];
    foreach ($required as $k) {
        if (!array_key_exists($k, $q)) $missing[] = $k;
    }
    if (count($missing)) {
        fwrite(STDERR, "Skipping question (missing: " . implode(',', $missing) . ")\n");
        continue;
    }

    $insert->execute([
        ':id' => (string)$q['id'],
        ':title' => (string)$q['title'],
        ':description' => (string)$q['description'],
        ':difficulty' => (string)$q['difficulty'],
        ':category' => (string)$q['category'],
        ':template_code' => (string)$q['template_code'],
        ':test_cases' => json_encode($q['test_cases'], JSON_UNESCAPED_UNICODE),
        ':evaluation_criteria' => json_encode($q['evaluation_criteria'], JSON_UNESCAPED_UNICODE),
        ':sort_order' => (int)$i,
        ':session_id' => (string)$q['session_id'],
    ]);

    $changed = (int)$db->query('SELECT changes() AS c')->fetch()['c'];
    $seeded += $changed;
}

echo "Seeded {$seeded} questions\n";
